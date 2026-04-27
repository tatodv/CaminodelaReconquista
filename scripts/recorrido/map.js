const VIEWBOX = {
  width: 1920,
  height: 1080,
};

const FULL_MAP_VIEWBOX = `230 0 ${VIEWBOX.width - 230} ${VIEWBOX.height}`;
const STATIC_MAP_VIEWBOX = "320 36 780 980";

const MAP_ANCHORS = new Map([
  [1, { x: 552.32, y: 759.32 }],
  [2, { x: 602.86, y: 529.66 }],
  [3, { x: 496.8, y: 113.17 }],
  [4, { x: 797.3, y: 346.11 }],
  [5, { x: 821.25, y: 685 }],
  [6, { x: 682.05, y: 843.52 }],
]);

const MAP_ROUTE_POINTS = [
  { x: 552.3, y: 759.3 },
  { x: 485.9, y: 709.4 },
  { x: 526.1, y: 596.9 },
  { x: 558.7, y: 542.1 },
  { x: 602.9, y: 529.7 },
  { x: 674.9, y: 485.7 },
  { x: 599.7, y: 419.2 },
  { x: 548.1, y: 263.4 },
  { x: 496.8, y: 113.2 },
  { x: 508.9, y: 154.3 },
  { x: 580.3, y: 254.7 },
  { x: 615.2, y: 224.8 },
  { x: 632.4, y: 256.7 },
  { x: 634.2, y: 308.8 },
  { x: 731.3, y: 381.9 },
  { x: 797.3, y: 346.1 },
  { x: 800.8, y: 388 },
  { x: 821.2, y: 421.7 },
  { x: 808.3, y: 444.5 },
  { x: 826.3, y: 492.8 },
  { x: 894.9, y: 649.6 },
  { x: 923.9, y: 667.8 },
  { x: 821.3, y: 685 },
  { x: 791.1, y: 803.9 },
  { x: 759.1, y: 923.1 },
  { x: 682, y: 843.5 },
];

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function isCompactViewport() {
  return window.matchMedia("(max-width: 899px)").matches;
}

function getRouteCoordinates(route) {
  return Array.isArray(route?.geometry?.coordinates)
    ? route.geometry.coordinates
    : [];
}

function getCoordinateBounds(points, routeCoordinates) {
  const coordinates = [
    ...points.map((point) => point.coordinates),
    ...routeCoordinates,
  ].filter((coordinate) => Array.isArray(coordinate) && coordinate.length >= 2);

  const lons = coordinates.map((coordinate) => Number(coordinate[0]));
  const lats = coordinates.map((coordinate) => Number(coordinate[1]));

  return {
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
}

function projectCoordinate(coordinate, bounds) {
  const lon = Number(coordinate[0]);
  const lat = Number(coordinate[1]);
  const lonRange = bounds.maxLon - bounds.minLon || 1;
  const latRange = bounds.maxLat - bounds.minLat || 1;
  const x = ((lon - bounds.minLon) / lonRange) * VIEWBOX.width;
  const y = ((bounds.maxLat - lat) / latRange) * VIEWBOX.height;

  return { x, y };
}

function createRoutePath(projectedRoute) {
  return projectedRoute
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}

function getDisplayPoint(point, fallbackPoint) {
  return MAP_ANCHORS.get(Number(point.order)) || fallbackPoint;
}

function buildGeometry(points, route) {
  const routeCoordinates = getRouteCoordinates(route);
  const bounds = getCoordinateBounds(points, routeCoordinates);
  const projectedRoute = routeCoordinates.map((coordinate) =>
    projectCoordinate(coordinate, bounds),
  );
  const projectedPoints = points.map((point) =>
    projectCoordinate(point.coordinates, bounds),
  );
  const displayPoints = points.map((point, index) =>
    getDisplayPoint(point, projectedPoints[index]),
  );
  const routePath = createRoutePath(
    MAP_ROUTE_POINTS.length > 0 ? MAP_ROUTE_POINTS : projectedRoute,
  );

  return {
    displayPoints,
    routePath,
  };
}

function getCompletedIndex(progress, total) {
  if (total <= 1) {
    return 0;
  }

  return Math.floor(clamp(progress, 0, 1) * (total - 1));
}

function createMapMarkup(points, displayPoints, routePath, options = {}) {
  const activeIndex = Number.isFinite(options.activeIndex)
    ? options.activeIndex
    : 0;
  const progress = clamp(Number(options.progress) || 0, 0, 1);
  const completedIndex = getCompletedIndex(progress, points.length);
  const idPrefix = options.idPrefix || "storyMap";
  const interactive = options.interactive !== false;
  const svgViewBox = options.staticProgress === true
    ? STATIC_MAP_VIEWBOX
    : FULL_MAP_VIEWBOX;
  const preserveAspectRatio = options.staticProgress === true
    ? "xMidYMid meet"
    : "xMinYMid slice";
  const dashAttrs =
    options.staticProgress === true
      ? ` stroke-dasharray="1" stroke-dashoffset="${(1 - progress).toFixed(3)}"`
      : "";
  const pathLengthAttribute = options.staticProgress === true ? ' pathLength="1"' : "";

  return [
    `<div class="story-map${interactive ? "" : " story-map--static"}" role="img" aria-label="Mapa animado del Camino de la Reconquista">`,
    '  <div class="story-map__viewport">',
    `    <svg class="story-map__svg" viewBox="${svgViewBox}" preserveAspectRatio="${preserveAspectRatio}" aria-hidden="true">`,
    "      <defs>",
    `        <filter id="${idPrefix}-routeGlow" x="-50%" y="-50%" width="200%" height="200%">`,
    '          <feGaussianBlur stdDeviation="4" result="blur"></feGaussianBlur>',
    '          <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>',
    "        </filter>",
    `        <radialGradient id="${idPrefix}-focusGradient" cx="50%" cy="50%" r="50%">`,
    '          <stop offset="0%" stop-color="#e86f2d" stop-opacity="0.34"></stop>',
    '          <stop offset="72%" stop-color="#e86f2d" stop-opacity="0.1"></stop>',
    '          <stop offset="100%" stop-color="#e86f2d" stop-opacity="0"></stop>',
    "        </radialGradient>",
    `        <linearGradient id="${idPrefix}-mapDepth" x1="0%" y1="0%" x2="100%" y2="0%">`,
    '          <stop offset="0%" stop-color="#f3eadf" stop-opacity="0.08"></stop>',
    '          <stop offset="58%" stop-color="#918a80" stop-opacity="0.10"></stop>',
    '          <stop offset="77%" stop-color="#1f2829" stop-opacity="0.18"></stop>',
    '          <stop offset="100%" stop-color="#141a1b" stop-opacity="0.36"></stop>',
    "        </linearGradient>",
    "      </defs>",
    '      <image class="story-map__base-image" href="/material/mapa_sinpuntos.webp" x="0" y="0" width="1920" height="1080" preserveAspectRatio="xMidYMid slice"></image>',
    '      <rect class="story-map__paper-wash" width="1920" height="1080"></rect>',
    `      <rect class="story-map__depth" width="1920" height="1080" fill="url(#${idPrefix}-mapDepth)"></rect>`,
    `      <path class="story-map__route-base" d="${routePath}"></path>`,
    `      <path class="story-map__route-glow" d="${routePath}"${pathLengthAttribute} filter="url(#${idPrefix}-routeGlow)"${dashAttrs}></path>`,
    `      <path class="story-map__route-progress" d="${routePath}"${pathLengthAttribute}${dashAttrs}></path>`,
    '      <g class="story-map__focuses">',
    ...displayPoints.map((point, index) => (
      `        <circle class="story-map__focus${index === activeIndex ? " is-active" : ""}" data-map-focus="${index}" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="94" fill="url(#${idPrefix}-focusGradient)"></circle>`
    )),
    "      </g>",
    '      <g class="story-map__points">',
    ...points.map((point, index) => {
      const projected = displayPoints[index];
      const stateClasses = [
        index === activeIndex ? "is-active" : "",
        index <= completedIndex ? "is-complete" : "",
      ].filter(Boolean).join(" ");

      return [
        `        <g class="story-map__point ${stateClasses}" data-map-point="${index}" transform="translate(${projected.x.toFixed(1)} ${projected.y.toFixed(1)})">`,
        '          <circle class="story-map__point-ring" r="38"></circle>',
        '          <circle class="story-map__point-core" r="28"></circle>',
        `          <text class="story-map__point-number" y="8">${point.order}</text>`,
        "        </g>",
      ].join("");
    }),
    "      </g>",
    "    </svg>",
    "  </div>",
    interactive
      ? [
          '  <div class="story-map__controls">',
          '    <button class="story-map__control" type="button" data-map-zoom="in" aria-label="Acercar mapa">+</button>',
          '    <button class="story-map__control" type="button" data-map-zoom="out" aria-label="Alejar mapa">-</button>',
          "  </div>",
          '  <div class="story-map__dots" aria-hidden="true">',
          ...points.map((_, index) => `<span data-map-dot="${index}" class="${index === activeIndex ? "is-active" : ""}"></span>`),
          "  </div>",
        ].join("")
      : "",
    "</div>",
  ].join("");
}

export function createMapSnapshotMarkup({ points, route, activeIndex = 0, progress = 0, idPrefix = "snapshot" }) {
  const geometry = buildGeometry(points, route);

  return createMapMarkup(points, geometry.displayPoints, geometry.routePath, {
    activeIndex,
    progress,
    idPrefix,
    interactive: false,
    staticProgress: true,
  });
}

export async function createMapController({
  containerId,
  points,
  route,
  statusElement,
}) {
  const container = document.getElementById(containerId);
  const geometry = buildGeometry(points, route);

  container.innerHTML = createMapMarkup(
    points,
    geometry.displayPoints,
    geometry.routePath,
    {
      idPrefix: "mainStoryMap",
      interactive: true,
    },
  );

  const viewport = container.querySelector(".story-map__viewport");
  const progressPath = container.querySelector(".story-map__route-progress");
  const glowPath = container.querySelector(".story-map__route-glow");
  const pointNodes = Array.from(container.querySelectorAll("[data-map-point]"));
  const focusNodes = Array.from(container.querySelectorAll("[data-map-focus]"));
  const dotNodes = Array.from(container.querySelectorAll("[data-map-dot]"));
  const routeLength = progressPath.getTotalLength();

  [progressPath, glowPath].forEach((path) => {
    path.style.strokeDasharray = routeLength;
    path.style.strokeDashoffset = routeLength;
  });

  if (statusElement) {
    statusElement.textContent = "Mapa listo";
    statusElement.dataset.state = "ready";
  }

  let activeIndex = 0;
  let progress = 0;
  let userScale = 1;

  function applyCamera(index, instant = false) {
    const point = geometry.displayPoints[index] || geometry.displayPoints[0];
    const compact = isCompactViewport();
    const baseScale = compact ? 1.02 : 1.08;
    const scale = baseScale * userScale;
    const xPercent = (point.x / VIEWBOX.width) * 100;
    const yPercent = (point.y / VIEWBOX.height) * 100;
    const targetX = compact ? 42 : 34;
    const pullX = clamp(targetX - xPercent, -12, 2.5);
    const pullY = clamp(50 - yPercent, -4.4, 4.4);

    viewport.style.transitionDuration = instant ? "0ms" : "900ms";
    viewport.style.transformOrigin = `${xPercent}% ${yPercent}%`;
    viewport.style.transform = `translate(${pullX}%, ${pullY}%) scale(${scale})`;
  }

  function updatePointState() {
    const completedIndex = getCompletedIndex(progress, points.length);

    pointNodes.forEach((node, index) => {
      node.classList.toggle("is-active", index === activeIndex);
      node.classList.toggle("is-complete", index <= completedIndex);
    });

    focusNodes.forEach((node, index) => {
      node.classList.toggle("is-active", index === activeIndex);
    });

    dotNodes.forEach((node, index) => {
      node.classList.toggle("is-active", index === activeIndex);
      node.classList.toggle("is-complete", index <= completedIndex);
    });
  }

  function setRouteProgress(nextProgress) {
    progress = clamp(nextProgress, 0, 1);
    const visibleLength = routeLength * progress;
    const offset = routeLength - visibleLength;

    progressPath.style.strokeDashoffset = offset;
    glowPath.style.strokeDashoffset = offset;
    updatePointState();
  }

  function setActivePoint(index, options = {}) {
    activeIndex = clamp(index, 0, points.length - 1);

    if (typeof options.progress === "number") {
      setRouteProgress(options.progress);
    }

    updatePointState();
    applyCamera(activeIndex, options.instant);
  }

  function resetOverview() {
    userScale = 1;
    viewport.style.transitionDuration = "900ms";
    viewport.style.transformOrigin = "50% 50%";
    viewport.style.transform = "translate(0, 0) scale(1)";
  }

  function resize() {
    applyCamera(activeIndex, true);
  }

  container
    .querySelector('[data-map-zoom="in"]')
    ?.addEventListener("click", () => {
      userScale = clamp(userScale + 0.12, 0.9, 1.42);
      applyCamera(activeIndex);
    });

  container
    .querySelector('[data-map-zoom="out"]')
    ?.addEventListener("click", () => {
      userScale = clamp(userScale - 0.12, 0.9, 1.42);
      applyCamera(activeIndex);
    });

  resetOverview();
  setRouteProgress(0);
  updatePointState();

  return {
    setRouteProgress,
    setActivePoint,
    resetOverview,
    resize,
  };
}
