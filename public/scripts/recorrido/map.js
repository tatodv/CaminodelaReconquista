const MAP_STYLE = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    "osm-raster": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#1d1b19",
      },
    },
    {
      id: "osm-raster",
      type: "raster",
      source: "osm-raster",
      paint: {
        "raster-opacity": 0.74,
        "raster-saturation": -0.96,
        "raster-contrast": 0.34,
        "raster-brightness-min": 0.04,
        "raster-brightness-max": 0.62,
      },
    },
  ],
};

function once(target, eventName) {
  return new Promise((resolve) => {
    target.once(eventName, resolve);
  });
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function isCompactViewport() {
  return window.matchMedia("(max-width: 899px)").matches;
}

function createRouteGradient(progress, opacity = 1) {
  const clamped = clamp(progress, 0, 1);
  const start = Math.max(0, clamped - 0.012);
  const end = Math.min(1, clamped + 0.01);
  const solid = `rgba(221, 120, 71, ${opacity})`;
  const glow = `rgba(255, 221, 181, ${opacity})`;
  const transparent = "rgba(221, 120, 71, 0)";

  return [
    "interpolate",
    ["linear"],
    ["line-progress"],
    0,
    solid,
    start,
    solid,
    clamped,
    glow,
    end,
    transparent,
    1,
    transparent,
  ];
}

function buildFocusBounds(maplibregl, points, index) {
  const current = points[index];
  const previous = points[Math.max(0, index - 1)];
  const next = points[Math.min(points.length - 1, index + 1)];
  const candidates = [previous, current, next].filter(Boolean);
  const bounds = new maplibregl.LngLatBounds(
    current.coordinates,
    current.coordinates,
  );

  candidates.forEach((candidate) => bounds.extend(candidate.coordinates));

  return bounds;
}

function getCameraForPoint(map, maplibregl, points, index) {
  const compact = isCompactViewport();
  const bounds = buildFocusBounds(maplibregl, points, index);
  const camera = map.cameraForBounds(bounds, {
    padding: compact
      ? { top: 96, right: 28, bottom: 320, left: 28 }
      : { top: 96, right: 96, bottom: 150, left: 96 },
    maxZoom: compact ? 12.9 : 12.45,
    offset: compact ? [0, -22] : [0, 0],
  });

  return {
    ...camera,
    bearing: 0,
    pitch: compact ? 0 : 0,
    duration: 1200,
    essential: true,
  };
}

function createActiveMarker(maplibregl) {
  const markerElement = document.createElement("div");
  markerElement.className = "map-pulse-marker";
  markerElement.setAttribute("aria-hidden", "true");
  markerElement.innerHTML = [
    '<span class="map-pulse-marker__glow"></span>',
    '<span class="map-pulse-marker__core"></span>',
  ].join("");

  return new maplibregl.Marker({
    element: markerElement,
    anchor: "center",
  });
}

export async function createMapController({
  containerId,
  points,
  route,
  pointsFeatureCollection,
  statusElement,
}) {
  const map = new window.maplibregl.Map({
    container: containerId,
    style: MAP_STYLE,
    center: points[0].coordinates,
    zoom: 10.35,
    attributionControl: false,
    cooperativeGestures: false,
    dragPan: !isCompactViewport(),
    scrollZoom: false,
    touchZoomRotate: false,
    doubleClickZoom: false,
    pitchWithRotate: false,
  });

  map.addControl(
    new window.maplibregl.AttributionControl({ compact: true }),
    "bottom-right",
  );

  if (!isCompactViewport()) {
    map.addControl(
      new window.maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
  }

  const activeMarker = createActiveMarker(window.maplibregl);
  let activeIndex = 0;
  let progress = 0;

  map.on("error", () => {
    if (statusElement) {
      statusElement.textContent =
        "No se pudo cargar el mapa en vivo. El relato sigue disponible.";
      statusElement.dataset.state = "error";
    }
  });

  await once(map, "load");

  map.addSource("route", {
    type: "geojson",
    data: route,
    lineMetrics: true,
  });

  map.addSource("points", {
    type: "geojson",
    data: pointsFeatureCollection,
  });

  map.addLayer({
    id: "route-base",
    type: "line",
    source: "route",
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "rgba(62, 59, 57, 0.28)",
      "line-opacity": 0.78,
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        9,
        4,
        13,
        7,
      ],
    },
  });

  map.addLayer({
    id: "route-progress-glow",
    type: "line",
    source: "route",
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        9,
        10,
        13,
        17,
      ],
      "line-blur": 3.6,
      "line-gradient": createRouteGradient(0, 0.86),
    },
  });

  map.addLayer({
    id: "route-progress",
    type: "line",
    source: "route",
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        9,
        4,
        13,
        6.5,
      ],
      "line-gradient": createRouteGradient(0, 1),
    },
  });

  map.addLayer({
    id: "points-base",
    type: "circle",
    source: "points",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        9,
        11,
        13,
        14,
      ],
      "circle-color": "#ece5da",
      "circle-stroke-width": 2,
      "circle-stroke-color": "rgba(20, 18, 16, 0.72)",
      "circle-opacity": 0.78,
    },
  });

  map.addLayer({
    id: "points-complete",
    type: "circle",
    source: "points",
    filter: ["<=", ["get", "order"], 1],
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        9,
        11,
        13,
        14,
      ],
      "circle-color": "#dd7847",
      "circle-stroke-width": 3,
      "circle-stroke-color": "#f6d6c1",
    },
  });

  map.addLayer({
    id: "point-labels",
    type: "symbol",
    source: "points",
    layout: {
      "text-field": ["to-string", ["get", "order"]],
      "text-font": ["Open Sans Bold"],
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        9,
        10,
        13,
        12,
      ],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": "#fff4ec",
      "text-halo-color": "rgba(16, 14, 12, 0.52)",
      "text-halo-width": 1,
    },
  });

  const overviewBounds = new window.maplibregl.LngLatBounds(
    points[0].coordinates,
    points[0].coordinates,
  );
  points.forEach((point) => overviewBounds.extend(point.coordinates));
  map.fitBounds(overviewBounds, {
    padding: isCompactViewport()
      ? { top: 90, right: 24, bottom: 210, left: 24 }
      : { top: 90, right: 90, bottom: 140, left: 90 },
    duration: 0,
  });

  activeMarker.setLngLat(points[0].coordinates).addTo(map);

  if (statusElement) {
    statusElement.textContent = "Mapa listo";
    statusElement.dataset.state = "ready";
  }

  function updateCompleteFilter() {
    const completedOrder = Math.max(
      1,
      Math.floor(progress * (points.length - 1)) + 1,
    );

    if (map.getLayer("points-complete")) {
      map.setFilter("points-complete", [
        "<=",
        ["get", "order"],
        completedOrder,
      ]);
    }
  }

  function setRouteProgress(nextProgress) {
    progress = clamp(nextProgress, 0, 1);

    if (map.getLayer("route-progress")) {
      map.setPaintProperty(
        "route-progress",
        "line-gradient",
        createRouteGradient(progress, 1),
      );
    }

    if (map.getLayer("route-progress-glow")) {
      map.setPaintProperty(
        "route-progress-glow",
        "line-gradient",
        createRouteGradient(progress, 0.86),
      );
    }

    updateCompleteFilter();
  }

  function setActivePoint(index, options = {}) {
    activeIndex = clamp(index, 0, points.length - 1);
    const point = points[activeIndex];
    const markerElement = activeMarker.getElement();
    const camera = getCameraForPoint(map, window.maplibregl, points, activeIndex);

    activeMarker.setLngLat(point.coordinates);
    markerElement.classList.remove("is-pulsing");
    window.requestAnimationFrame(() => markerElement.classList.add("is-pulsing"));

    if (options.instant) {
      map.jumpTo({
        center: camera.center,
        zoom: camera.zoom,
        bearing: camera.bearing,
        pitch: camera.pitch,
      });
      return;
    }

    map.easeTo(camera);
  }

  function resetOverview() {
    map.fitBounds(overviewBounds, {
      padding: isCompactViewport()
        ? { top: 90, right: 24, bottom: 210, left: 24 }
        : { top: 90, right: 90, bottom: 140, left: 90 },
      duration: 1100,
      essential: true,
    });
  }

  function resize() {
    map.resize();
    setActivePoint(activeIndex, { instant: true });
  }

  return {
    map,
    setRouteProgress,
    setActivePoint,
    resetOverview,
    resize,
  };
}
