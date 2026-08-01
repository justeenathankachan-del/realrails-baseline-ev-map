import os
import time
import requests
import json
from dotenv import load_dotenv

# ─────────────────────────────
# Setup
# ─────────────────────────────
load_dotenv()
API_KEY = os.getenv("OCM_API_KEY")

if not API_KEY:
    print("❌ API key not found")
    exit()

print("✅ API key loaded\n")

BASE_URL = "https://api.openchargemap.io/v3"
MAX_RESULTS = 100000   # large request (best practical approach)


# ─────────────────────────────
# Get countries
# ─────────────────────────────
def get_country_list():
    url = f"{BASE_URL}/referencedata/?key={API_KEY}"
    res = requests.get(url)

    if res.status_code != 200:
        print("❌ Failed to fetch countries")
        return []

    data = res.json()
    return data.get("Countries", [])


# ─────────────────────────────
# Get count per country (NO pagination)
# ─────────────────────────────
def get_count_for_country(iso):
    url = f"{BASE_URL}/poi/"
    params = {
        "output": "json",
        "countrycode": iso,
        "maxresults": MAX_RESULTS,
        "compact": True,
        "verbose": False,
        "key": API_KEY
    }

    try:
        res = requests.get(url, params=params, timeout=60)

        if res.status_code != 200:
            print(f"⚠️ Failed for {iso}")
            return 0, False

        data = res.json()

        if not isinstance(data, list):
            return 0, False

        count = len(data)

        # 🔥 truncation detection
        truncated = count == MAX_RESULTS

        return count, truncated

    except Exception as e:
        print(f"Error for {iso}: {e}")
        return 0, False


# ─────────────────────────────
# Main
# ─────────────────────────────
def main():
    countries = get_country_list()

    print(f"🌍 Found {len(countries)} regions\n")

    total = 0
    results = []
    truncated_list = []

    for i, c in enumerate(countries):
        name = c.get("Title", "Unknown")
        iso = c.get("ISOCode", "")

        print(f"{i+1:03d}. Fetching {name} ({iso})...")

        count, truncated = get_count_for_country(iso)

        total += count

        if truncated:
            truncated_list.append(name)

        print(f"     → {count}{' ⚠️ TRUNCATED' if truncated else ''}")

        results.append({
            "country": name,
            "iso": iso,
            "count": count,
            "truncated": truncated
        })

        time.sleep(0.3)

    # ─────────────────────────────
    # Save results
    # ─────────────────────────────
    os.makedirs("data", exist_ok=True)

    with open("data/country_counts.json", "w", encoding="utf-8") as f:
        json.dump({
            "total": total,
            "countries": results,
            "truncated_countries": truncated_list
        }, f, indent=2)

    print("\n────────────────────────────")
    print(f"🌍 Estimated Total Stations: {total}")
    print(f"⚠️ Possibly truncated countries: {len(truncated_list)}")

    if truncated_list:
        print("Examples:", truncated_list[:10])

    print("💾 Saved → data/country_counts.json")
    print("✅ Done")


# ─────────────────────────────
# Run
# ─────────────────────────────
if __name__ == "__main__":
    main()