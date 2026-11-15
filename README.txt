# MarsPath — Jezero Crater EVA Tactical Route Planner

**MarsPath** is an interactive planetary GIS web application built for the **2026 NASA International Space Apps Challenge** (*Interplanetary Survival Guide: Martian Map*). It synthesizes orbital imagery, elevation data, standardized USGS planetary geology, and Perseverance rover surface imagery into a hyperlocalized Extravehicular Activity (EVA) route evaluator for astronauts exploring Jezero Crater.

## Key Features
- **Multi-Layered NASA & USGS Map:** Streams live JPL Mars Trek optical mosaics (`Viking MDIM 2.1`) and MOLA elevation hillshade layers in `EPSG:4326` projection alongside USGS geologic unit polygons (`SIM 3292`).
- **Interactive Surface Inspector:** Click any geologic formation or Perseverance mission waypoint to inspect terrain mobility hazards, astrobiological objectives, elevation, and real rover Navcam/Mastcam-Z imagery.
- **Mars-Calibrated EVA Traverse Evaluator:** Computes surface distance using the Haversine formula calibrated to **Mars's planetary radius ($R_{\text{Mars}} = 3,389.5\text{ km}$)**, evaluates elevation gain and slope grade, estimates spacesuit walking time, and flags terrain or 8-hour oxygen reserve hazards.

## Official Data Sources
1. **NASA/JPL Mars Trek WMTS:** Viking Color Mosaic (`232m`) and MGS MOLA Color Hillshade (`463m`).
2. **USGS Planetary Geologic Mapping Program:** Standardized Geologic Map of Mars (`SIM 3292`) queried via the USGS Astrogeology PyGeoAPI and enriched via Python (`scripts/fetch_mars_data.py`).
3. **NASA Mars 2020 Perseverance Raw Images:** Verified surface imagery from Sols 3, 201, 415, 682, and 1150.

## Architecture & Tech Stack
- **Data Pipeline:** Python 3 (`requests`, `pathlib`) for querying and enriching USGS GeoJSON bounding-box datasets.
- **Frontend:** HTML5, CSS3, Vanilla JavaScript, and **Leaflet.js** configured with `L.CRS.EPSG4326`.

## Running Locally
```bash
git clone <your-repo-url>
cd MarsPath
python3 -m http.server 8000