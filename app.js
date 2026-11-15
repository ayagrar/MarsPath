// 1. Initialize Leaflet Map centered on Jezero Crater [lat, lon]
const map = L.map("map", {
  crs: L.CRS.EPSG4326,
  center: [18.458, 77.410],
  zoom: 9,
  minZoom: 2,
  maxZoom: 14
});

// 2. NASA JPL Mars Trek Base Optical Layer (Viking Color Mosaic with EPSG:4326 zoomOffset)
const vikingOpticalLayer = L.tileLayer(
  "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",
  {
    attribution: "NASA/JPL-Caltech Mars Trek",
    tileSize: 256,
    zoomOffset: -1,
    maxNativeZoom: 8,
    noWrap: true
  }
).addTo(map);

// 3. NASA JPL Mars Trek MOLA Elevation Color Hillshade Overlay
const molaElevationLayer = L.tileLayer(
  "https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",
  {
    attribution: "NASA/JPL MOLA",
    tileSize: 256,
    zoomOffset: -1,
    maxNativeZoom: 7,
    opacity: 0.55,
    noWrap: true
  }
);

let geologyLayer = null;
let waypointsLayer = L.layerGroup().addTo(map);
let allWaypoints = [];
let activeRouteLine = null;

const inspector = document.getElementById("inspector-panel");

// Helper: Try loading from data/ first, then fallback to root folder
async function fetchJsonSmart(filename) {
  let res = await fetch(`data/${filename}`);
  if (!res.ok) {
    res = await fetch(filename);
  }
  if (!res.ok) {
    throw new Error(`Could not find ${filename}`);
  }
  return res.json();
}

// 4. Load Enriched USGS Geology GeoJSON
fetchJsonSmart("jezero_geology.geojson")
  .then((geoData) => {
    geologyLayer = L.geoJSON(geoData, {
      style: (feature) => ({
        color: feature.properties.map_color || "#3b82f6",
        weight: 2,
        fillColor: feature.properties.map_color || "#3b82f6",
        fillOpacity: 0.25
      }),
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        layer.on("click", () => {
          inspector.innerHTML = `
            <h2>Geologic Unit Inspector</h2>
            <span class="badge" style="background:${p.map_color}; color:#000;">Unit: ${p.unit}</span>
            <h3>${p.unitdesc}</h3>
            <p><strong>Mobility Hazard:</strong> ${p.mobility_hazard}</p>
            <p><strong>Science Value:</strong> ${p.science_note}</p>
            <p class="muted">Mapped Area: ${Math.round(p.spharea_km).toLocaleString()} km²</p>
          `;
        });
      }
    }).addTo(map);
  })
  .catch((err) => console.error("Error loading geology GeoJSON:", err));

// 5. Load Perseverance Science Waypoints
fetchJsonSmart("waypoints.json")
  .then((waypoints) => {
    allWaypoints = waypoints;
    const startSelect = document.getElementById("route-start");
    const endSelect = document.getElementById("route-end");

    waypoints.forEach((wp, index) => {
      startSelect.add(new Option(wp.name, wp.id));
      endSelect.add(new Option(wp.name, wp.id));
      if (index === 2) endSelect.selectedIndex = 2;
    });

    waypoints.forEach((wp) => {
      const marker = L.circleMarker([wp.lat, wp.lon], {
        radius: 8,
        fillColor: "#f97316",
        color: "#ffffff",
        weight: 2,
        fillOpacity: 0.95
      });

      marker.bindTooltip(wp.name, { direction: "top" });

      marker.on("click", () => {
        inspector.innerHTML = `
          <h2>Waypoint Inspector</h2>
          <span class="badge">Hazard: ${wp.hazard_level} | Elev: ${wp.elevation_m} m</span>
          <h3>${wp.name}</h3>
          <p class="muted">${wp.type} (${wp.lat.toFixed(4)}°N, ${wp.lon.toFixed(4)}°E)</p>
          <p>${wp.summary}</p>
          <p><strong>Science Objective:</strong> ${wp.science_goal}</p>
          <img src="${wp.image_url}" alt="${wp.name}" onerror="this.style.display='none'" />
          <p class="muted" style="font-size:0.75rem; margin-top:4px;">${wp.image_credit}</p>
        `;
      });

      marker.addTo(waypointsLayer);
    });
  })
  .catch((err) => console.error("Error loading waypoints JSON:", err));

// 6. Wire Up Layer Toggles
document.getElementById("toggle-elevation").addEventListener("change", (e) => {
  if (e.target.checked) {
    molaElevationLayer.addTo(map);
  } else {
    map.removeLayer(molaElevationLayer);
  }
});

document.getElementById("toggle-geology").addEventListener("change", (e) => {
  if (!geologyLayer) return;
  if (e.target.checked) {
    geologyLayer.addTo(map);
  } else {
    map.removeLayer(geologyLayer);
  }
});

document.getElementById("toggle-waypoints").addEventListener("change", (e) => {
  if (e.target.checked) {
    waypointsLayer.addTo(map);
  } else {
    map.removeLayer(waypointsLayer);
  }
});

// 7. Mars-Specific Haversine Distance Calculation (R_mars = 3389.5 km)
function calculateMarsDistanceKm(lat1, lon1, lat2, lon2) {
  const R_MARS = 3389.5;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.asin(Math.sqrt(a));
  return R_MARS * c;
}

// 8. Evaluate EVA Traverse Route
document.getElementById("btn-plan-route").addEventListener("click", () => {
  const startId = document.getElementById("route-start").value;
  const endId = document.getElementById("route-end").value;
  const resultsBox = document.getElementById("route-results");

  if (!startId || !endId || startId === endId) {
    resultsBox.innerHTML = `<div class="warning-box">Select two distinct waypoints to calculate a traverse.</div>`;
    return;
  }

  const startWp = allWaypoints.find((w) => w.id === startId);
  const endWp = allWaypoints.find((w) => w.id === endId);

  if (activeRouteLine) {
    map.removeLayer(activeRouteLine);
  }

  activeRouteLine = L.polyline(
    [
      [startWp.lat, startWp.lon],
      [endWp.lat, endWp.lon]
    ],
    {
      color: "#38bdf8",
      weight: 4,
      dashArray: "8, 8"
    }
  ).addTo(map);

  map.fitBounds(activeRouteLine.getBounds(), { padding: [60, 60], maxZoom: 10 });

  const distanceKm = calculateMarsDistanceKm(startWp.lat, startWp.lon, endWp.lat, endWp.lon);
  const elevDelta = endWp.elevation_m - startWp.elevation_m;
  const gradePercent = distanceKm > 0 ? (Math.abs(elevDelta) / (distanceKm * 1000)) * 100 : 0;

  const uphillPenalty = elevDelta > 0 ? 1 + (elevDelta / 200) : 1;
  const oneWayHours = (distanceKm / 2.5) * uphillPenalty;
  const roundTripHours = oneWayHours * 2;

  const hazards = [];
  if (startWp.hazard_level === "High" || endWp.hazard_level === "High") {
    hazards.push("High-risk terrain zone (steep delta scarp or deep sand ripples) at endpoint.");
  }
  if (gradePercent > 2.5) {
    hazards.push(`Sustained slope grade (${gradePercent.toFixed(1)}%) increases EVA suit metabolic load.`);
  }
  if (roundTripHours > 8) {
    hazards.push(`Round-trip (${roundTripHours.toFixed(1)} hrs) exceeds standard 8-hr EVA oxygen reserve. Pressurized rover required.`);
  }

  const hazardHtml =
    hazards.length > 0
      ? `<div class="warning-box"><strong>Hazard Advisory:</strong><br>• ${hazards.join("<br>• ")}</div>`
      : `<div style="margin-top:8px; color:#34d399; font-size:0.8rem;">✓ Terrain within nominal foot-EVA safety limits.</div>`;

  resultsBox.innerHTML = `
    <div class="telemetry-box">
      <div><strong>Surface Distance:</strong> ${distanceKm.toFixed(2)} km</div>
      <div><strong>Elevation Change:</strong> ${elevDelta >= 0 ? "+" : ""}${elevDelta} m (${gradePercent.toFixed(1)}% grade)</div>
      <div><strong>Est. EVA Time (1-Way):</strong> ${oneWayHours.toFixed(1)} hrs (${roundTripHours.toFixed(1)} hrs round-trip)</div>
    </div>
    ${hazardHtml}
  `;
});

document.getElementById("btn-clear-route").addEventListener("click", () => {
  if (activeRouteLine) {
    map.removeLayer(activeRouteLine);
    activeRouteLine = null;
  }
  document.getElementById("route-results").innerHTML = "";
});
