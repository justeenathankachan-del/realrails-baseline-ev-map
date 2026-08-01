from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from pathlib import Path
import pandas as pd
import numpy as np
import logging
import threading
import requests
import os
import io
import hashlib
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi.responses import StreamingResponse
from typing import Dict
from dotenv import load_dotenv
from typing import List, Dict,Optional, Any

# LOAD ENV
load_dotenv()

# LOGGING
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("dextere")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials = True,
)

# CONFIG
OCM_API_KEY = os.getenv("OCM_API_KEY")
EXCEL_PATH = Path("data/ev_stations.xlsx")
DATA_PATH = Path("data/store_df.pkl")
REF_PATH = Path("data/ocm_reference.pkl")

EXCEL_PATH.parent.mkdir(parents=True, exist_ok=True)

# STATE
store_df = None
reference_data: Dict[str, Dict[int, str]] = {}
scheduler = BackgroundScheduler()
data_lock = threading.Lock()
ref_lock = threading.Lock()

LAST_HASH = None
LAST_REF_HASH = None


def compute_hash(obj):
    if isinstance(obj, pd.DataFrame):
        return hashlib.md5(pd.util.hash_pandas_object(obj, index=True).values).hexdigest()
    return hashlib.md5(str(obj).encode()).hexdigest()


# ------------------ FETCH REFERENCE ------------------

def fetch_reference_data():
    global reference_data, LAST_REF_HASH

    if not OCM_API_KEY:
        log.warning("❌ OCM_API_KEY missing → fallback mode")
        reference_data = {"countries": {}, "operators": {}}
        return

    try:
        url = "https://api.openchargemap.io/v3/referencedata"
        params = {"key": OCM_API_KEY, "output": "json"}

        log.info("🌍 Fetching reference data...")
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        countries = {int(c['ID']): str(c['Title']) for c in data.get('Countries', [])}
        operators = {int(o['ID']): str(o['Title']) for o in data.get('Operators', [])}

        log.info(f"Countries fetched: {len(countries)}")
        log.info(f"Operators fetched: {len(operators)}")

        new_ref = {'countries': countries, 'operators': operators}
        new_hash = compute_hash(new_ref)

        if LAST_REF_HASH == new_hash:
            return

        with ref_lock:
            reference_data = new_ref
            LAST_REF_HASH = new_hash

        pd.to_pickle(new_ref, REF_PATH)
        log.info("✅ Reference cached")

    except Exception as e:
        log.error(f"Reference fetch failed: {e}")
        reference_data = {"countries": {}, "operators": {}}


# ------------------ LOAD DATA ------------------

def load_data():
    global store_df, LAST_HASH

    if not EXCEL_PATH.exists():
        log.error("❌ Excel file missing")
        return

    log.info("📊 Loading dataset...")

    df = pd.read_excel(EXCEL_PATH, engine="openpyxl")
    df.columns = [c.strip().lower() for c in df.columns]

    df.rename(columns={
        "latitude": "lat",
        "longitude": "lng",
        "countryid": "country_id",
        "operatorid": "operator_id",
        "usagetypeid": "usage_type",
        "title": "name"
    }, inplace=True)

    df['country_id'] = pd.to_numeric(df['country_id'], errors='coerce').fillna(0).astype(int)
    df['operator_id'] = pd.to_numeric(df['operator_id'], errors='coerce').fillna(0).astype(int)
    
    if "usage_type" in df.columns:
        df["usage_type"] = pd.to_numeric(df["usage_type"], errors="coerce").fillna(0).astype(int)

    with ref_lock:
        countries = reference_data.get('countries', {})
        operators = reference_data.get('operators', {})

    df['country_name'] = df['country_id'].map(countries).fillna(df['country_id'].astype(str))
    df['operator_name'] = df['operator_id'].map(operators).fillna(df['operator_id'].astype(str))

    df["lat"] = pd.to_numeric(df["lat"], errors="coerce")
    df["lng"] = pd.to_numeric(df["lng"], errors="coerce")

    df = df.dropna(subset=["lat", "lng"])
    df = df[df["lat"].between(-90, 90) & df["lng"].between(-180, 180)]
    df = df.replace([np.inf, -np.inf], np.nan).fillna(0)

    new_hash = compute_hash(df)
    if LAST_HASH == new_hash:
        log.info("⏭ No change in data")
        return

    with data_lock:
        store_df = df
        LAST_HASH = new_hash

    store_df.to_pickle(DATA_PATH)
    log.info(f"✅ Loaded {len(df)} stations")


def check_and_refresh():
    log.info("🔄 Refreshing...")
    fetch_reference_data()
    load_data()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global store_df, reference_data
    fetch_reference_data()
    load_data()
    if not scheduler.running:
        scheduler.add_job(check_and_refresh, IntervalTrigger(hours=24))
        scheduler.start()
    yield
    scheduler.shutdown()

app.router.lifespan_context = lifespan


# ------------------ API ------------------

@app.get("/api/metrics")
def get_metrics():
    with data_lock:
        if store_df is None or store_df.empty:
            return {
                "total_stations": 0,
                "countries": 0,
                "operators": 0,
                "dc_fast": 0
            }

        df = store_df.copy()

    dc_fast = df[df["usage_type"].isin([3,4,5])].shape[0] if "usage_type" in df.columns else 0

    return {
        "total_stations": len(df),
        "countries": df["country_name"].nunique(),
        "operators": df["operator_id"].nunique(),  # 🔥 FIXED
        "dc_fast": dc_fast
    }
@app.get("/api/stations")
def get_stations(
    min_lat: float,
    max_lat: float,
    min_lng: float,
    max_lng: float,
    zoom: int = 4,
):
    with data_lock:
        if store_df is None: return {"features": [], "total": 0}
        df = store_df.copy()

    df = df[(df["lat"] >= min_lat) & (df["lat"] <= max_lat) & (df["lng"] >= min_lng) & (df["lng"] <= max_lng)]

    if zoom < 4: LIMIT = 4000
    elif zoom < 6: LIMIT = 12000
    elif zoom < 8: LIMIT = 30000
    else: LIMIT = 60000

    if len(df) > LIMIT:
        df = df.sample(n=LIMIT, random_state=42)

    return {"features": df.to_dict("records"), "total": len(df)}
    
@app.get("/api/stations/filtered")
def get_filtered_stations(
    min_lat: float,
    max_lat: float,
    min_lng: float,
    max_lng: float,
    zoom: int = 4,
    charger_type: Optional[str] = None,
    country_id: Optional[List[int]] = Query(None),
    operator_id: Optional[List[str]] = Query(None),
):
    with data_lock:
        if store_df is None or store_df.empty:
            return {"features": [], "total": 0, "bounds": None}

        df = store_df.copy()

    # 1. 🌍 Spatial Filter (map bounds)
    df = df[
        (df["lat"] >= min_lat) & (df["lat"] <= max_lat) &
        (df["lng"] >= min_lng) & (df["lng"] <= max_lng)
    ]

    # 2. 🌎 Country Filter
    if country_id:
        df = df[df["country_id"].isin(country_id)]

    # 3. 🏢 Operator Filter (ID + NAME + PARTIAL MATCH)
    if operator_id:
        if isinstance(operator_id[0], str) and not str(operator_id[0]).isdigit():
            search_terms = [str(op).lower() for op in operator_id]

            df = df[
                df["operator_name"]
                .astype(str)
                .str.lower()
                .apply(lambda name: any(term in name for term in search_terms))
            ]
        else:
            df = df[df["operator_id"].isin([int(op) for op in operator_id])]

    # 4. ⚡ Charger Type Filter
    if charger_type and "usage_type" in df.columns:
        if charger_type == "l1":
            df = df[df["usage_type"] == 1]
        elif charger_type == "l2":
            df = df[df["usage_type"] == 2]
        elif charger_type == "dc_fast":
            df = df[df["usage_type"].isin([3, 4, 5])]

    # 5. 📉 Sampling based on zoom (performance)
    if zoom < 4:
        LIMIT = 4000
    elif zoom < 6:
        LIMIT = 12000
    elif zoom < 8:
        LIMIT = 30000
    else:
        LIMIT = 60000

    if len(df) > LIMIT:
        df = df.sample(n=LIMIT, random_state=42)

    # 6. 🔥 Compute bounds (for auto-zoom)
    if not df.empty:
        bounds = {
            "min_lat": float(df["lat"].min()),
            "max_lat": float(df["lat"].max()),
            "min_lng": float(df["lng"].min()),
            "max_lng": float(df["lng"].max()),
        }
    else:
        bounds = None

    return {
        "features": df.to_dict("records"),
        "total": len(df),
        "bounds": bounds,
    }
# ------------------ FILTER OPTIONS API ------------------

# ------------------ FILTER OPTIONS API ------------------

@app.get("/api/filters/countries")
def get_all_countries():
    """Returns the FULL list of unique countries for a static dropdown."""
    with data_lock:
        if store_df is None or store_df.empty: return []
        # No search param here; send everything so the dropdown is pre-populated
        countries = store_df[['country_id', 'country_name']].drop_duplicates()
    
    return countries.sort_values("country_name").to_dict("records")

@app.get("/api/filters/operators")
def search_operators(q: str = Query(None)):
    """Returns operators based on typing (Autocomplete)."""
    with data_lock:
        if store_df is None or store_df.empty: return []
        operators = store_df[['operator_id', 'operator_name']].drop_duplicates()

    if q:
        # Filter as the user types
        operators = operators[operators['operator_name'].str.contains(q, case=False, na=False)]
    
    # Limit to top 20 results while typing to keep the UI clean
    return operators.sort_values("operator_name").head(20).to_dict("records")
@app.get("/api/stations/count")
def get_station_count(
    country_id: Optional[List[int]] = Query(None),
    operator_id: Optional[List[int]] = Query(None),
):
    with data_lock:
        if store_df is None or store_df.empty:
            return {"total": 0}
        df = store_df.copy()

    # 🔥 APPLY FILTERS ONLY (NO BOUNDS)
    if country_id:
        df = df[df["country_id"].isin(country_id)]

    if operator_id:
        df = df[df["operator_id"].isin(operator_id)]

    return {"total": len(df)}
@app.get("/api/top-operators")
def top_operators(
    country_id: Optional[List[int]] = Query(None),
    operator_id: Optional[List[int]] = Query(None),
):
    with data_lock:
        if store_df is None or store_df.empty:
            return []
        df = store_df.copy()

    # 🔥 Apply filters (same as map)
    if country_id:
        df = df[df["country_id"].isin(country_id)]

    if operator_id:
        df = df[df["operator_id"].isin(operator_id)]

    # 🔥 Group + count
    grouped = (
        df.groupby(["operator_id", "operator_name"])
        .size()
        .reset_index(name="count")
    )

    return grouped.sort_values("count", ascending=False).head(10).to_dict("records")
@app.get("/api/stations/csv")
def download_csv():
    with data_lock:
        if store_df is None: return {"error": "no data"}
        csv_data = store_df.to_csv(index=False)
    return StreamingResponse(io.StringIO(csv_data), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=stations.csv"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)