import os
import time
import requests
import json
import pandas as pd
from dotenv import load_dotenv
from datetime import datetime

# ─────────────────────────────
# Load API key
# ─────────────────────────────
load_dotenv()
API_KEY = os.getenv("OCM_API_KEY")

if not API_KEY:
    print("❌ API key not found in .env")
    exit()

BASE_URL = "https://api.openchargemap.io/v3"

os.makedirs("data", exist_ok=True)

# ─────────────────────────────
# Get country list
# ─────────────────────────────
def get_countries():
    res = requests.get(f"{BASE_URL}/referencedata/?key={API_KEY}")
    return res.json().get("Countries", [])

# ─────────────────────────────
# Fetch country data
# ─────────────────────────────
def fetch_country_data(iso):
    params = {
        "output": "json",
        "countrycode": iso,
        "maxresults": 100000,   # keeping your version
        "compact": True,
        "verbose": False,
        "key": API_KEY
    }

    try:
        res = requests.get(f"{BASE_URL}/poi/", params=params, timeout=60)
        if res.status_code != 200:
            return []
        return res.json()
    except:
        return []

# ─────────────────────────────
# MAIN
# ─────────────────────────────
def main():
    countries = get_countries()
    all_data = []

    print(f"🌍 Fetching {len(countries)} regions...\n")

    for i, c in enumerate(countries):
        name = c.get("Title")
        iso = c.get("ISOCode")

        print(f"{i+1}. Fetching {name} ({iso})...")

        data = fetch_country_data(iso)
        print(f"   → {len(data)} records")

        all_data.extend(data)

        time.sleep(0.5)

    # ─────────────────────────────
    # SAVE JSON
    # ─────────────────────────────
    print("\n💾 Saving JSON...")
    with open("data/all_stations.json", "w", encoding="utf-8") as f:
        json.dump(all_data, f)

    print(" JSON saved")

    # ─────────────────────────────
    # SHOW TOTAL
    # ─────────────────────────────
    print(f"\n Total records downloaded: {len(all_data)}")

    # ─────────────────────────────
    # CONVERT TO EXCEL
    # ─────────────────────────────
    print("📊 Converting to Excel...")

    rows = []
    for s in all_data:
        addr = s.get("AddressInfo", {})

        rows.append({
            "ID": s.get("ID"),
            "Title": addr.get("Title"),
            "CountryID": addr.get("CountryID"),
            "Latitude": addr.get("Latitude"),
            "Longitude": addr.get("Longitude"),
            "OperatorID": s.get("OperatorID"),
            "UsageTypeID": s.get("UsageTypeID")
        })

    df = pd.DataFrame(rows)

    # 🔥 Save latest (overwrite)
    latest_file = "data/ev_stations.xlsx"
    df.to_excel(latest_file, index=False)

    print(f"Excel saved → {latest_file}")

    # 🔥 Save snapshot (NEW ADDITION)
    today = datetime.now().strftime("%Y-%m-%d")
    snapshot_file = f"data/ev_stations_{today}.xlsx"
    df.to_excel(snapshot_file, index=False)

    print(f"Snapshot saved → {snapshot_file}")

    print(" DONE")

# ─────────────────────────────
# RUN
# ─────────────────────────────
if __name__ == "__main__":
    main()