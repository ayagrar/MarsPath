import json
from pathlib import Path
import requests

# Resolve paths relative to this script's location (MarsPath/scripts/ -> MarsPath/data/)
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)  # Creates data/ automatically if it doesn't exist

URL = "https://astrogeology.usgs.gov/pygeoapi/collections/mars/sim3292_global_geologic_map/units/items"

params = {
    "bbox": "77.0,18.0,78.2,19.0",
    "f": "json",
    "limit": 50
}

# Scientific & mobility classifications for Jezero region units
UNIT_METADATA = {
    "mNhm": {
        "color": "#ef4444",  # Red-Orange
        "hazard": "High — Steep crater rim slopes (>20°) & large boulder fields",
        "science": "Middle Noachian highland massif (>3.7 Ga); oldest exposed crustal bedrock."
    },
    "eHv": {
        "color": "#8b5cf6",  # Purple
        "hazard": "Moderate — Fractured volcanic plains & sharp basaltic ridges",
        "science": "Early Hesperian volcanic unit; critical for radiometric age calibration."
    },
    "HNt": {
        "color": "#10b981",  # Emerald Green
        "hazard": "Low-Moderate — Layered sedimentary benches & eroded scarps",
        "science": "Hesperian-Noachian transition; prime target for ancient lakebed biosignatures."
    },
    "lHt": {
        "color": "#f59e0b",  # Amber
        "hazard": "Moderate — Wind-sculpted ridges (yardangs) & loose sand ripples",
        "science": "Late Hesperian transition unit; records Mars's shift from wet to arid climate."
    },
    "lHl": {
        "color": "#3b82f6",  # Blue
        "hazard": "Low — Relatively flat basin floor; watch for fine dust traps",
        "science": "Late Hesperian lowland unit; smooth corridor ideal for rapid EVA traverses."
    }
}

DEFAULT_META = {
    "color": "#3b82f6",
    "hazard": "Moderate — Standard Martian regolith & scattered rocks",
    "science": "Standardized USGS Martian geologic unit."
}

print("Fetching USGS geological data for Jezero Crater...")
response = requests.get(URL, params=params, timeout=15)
response.raise_for_status()

geojson_data = response.json()
features = geojson_data.get("features", [])

# Enrich each GeoJSON feature with astronaut-relevant metadata
for feature in features:
    props = feature.get("properties", {})
    unit_code = props.get("unit", "")
    meta = UNIT_METADATA.get(unit_code, DEFAULT_META)
    
    props["map_color"] = meta["color"]
    props["mobility_hazard"] = meta["hazard"]
    props["science_note"] = meta["science"]
    print(f"  - Processed unit [{unit_code}]: {props.get('unitdesc')}")

output_file = DATA_DIR / "jezero_geology.geojson"
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(geojson_data, f, indent=2)

print(f"\nSuccess! Saved {len(features)} enriched units to: {output_file}")