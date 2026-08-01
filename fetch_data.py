import requests
import json
from dotenv import load_dotenv
import os

load_dotenv()

API_KEY = os.getenv("OCM_API_KEY")

if not API_KEY:
    print("ERROR: API key not found! Check your .env file")
    exit()

print(f"API Key loaded: ✓")

url = "https://api.openchargemap.io/v3/poi/"
params = {
    "output": "json",
    "maxresults": 5000,
    "compact": True,
    "verbose": False,
    "key": API_KEY,
    "countrycode": "US"
}

print("Fetching US EV stations...")
response = requests.get(url, params=params)

print(f"Status code: {response.status_code}")

if response.status_code != 200:
    print(f"ERROR: {response.text[:200]}")
    exit()

data = response.json()

os.makedirs("data", exist_ok=True)

with open("data/us_stations.json", "w") as f:
    json.dump(data, f, indent=2)

print(f"Done! Saved {len(data)} US stations")