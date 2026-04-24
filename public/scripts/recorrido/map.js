const VIEWBOX = {
  width: 1920,
  height: 1080,
  paddingX: 0,
  paddingY: 0,
};

const MAP_ANCHORS = new Map([
  [1, { x: 704, y: 614 }],
  [2, { x: 766, y: 368 }],
  [3, { x: 637, y: 78 }],
  [4, { x: 1010, y: 246 }],
  [5, { x: 1038, y: 570 }],
  [6, { x: 866, y: 710 }],
]);

const MAP_ROUTE_POINTS = [
  { x: 704, y: 614 },
  { x: 634, y: 558 },
  { x: 681, y: 438 },
  { x: 718, y: 380 },
  { x: 766, y: 368 },
  { x: 813, y: 327 },
  { x: 750, y: 288 },
  { x: 693, y: 181 },
  { x: 637, y: 78 },
  { x: 660, y: 118 },
  { x: 760, y: 205 },
  { x: 789, y: 165 },
  { x: 815, y: 194 },
  { x: 830, y: 248 },
  { x: 950, y: 300 },
  { x: 1010, y: 246 },
  { x: 1014, y: 286 },
  { x: 1034, y: 318 },
  { x: 1022, y: 340 },
  { x: 1040, y: 386 },
  { x: 1108, y: 535 },
  { x: 1136, y: 552 },
  { x: 1038, y: 570 },
  { x: 986, y: 688 },
  { x: 932, y: 806 },
  { x: 866, y: 710 },
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
  const usableWidth = VIEWBOX.width - VIEWBOX.paddingX * 2;
  const usableHeight = VIEWBOX.height - VIEWBOX.paddingY * 2;
  const x = VIEWBOX.paddingX + ((lon - bounds.minLon) / lonRange) * usableWidth;
  const y = VIEWBOX.paddingY + ((bounds.maxLat - lat) / latRange) * usableHeight;

  return {
    x,
    y,
  };
}

function createRoutePath(projectedRoute) {
  return projectedRoute
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}

function getPointProgress(index, total) {
  if (total <= 1) {
    return 1;
  }

  return index / (total - 1);
}

function getDisplayPoint(point, fallbackPoint) {
  return MAP_ANCHORS.get(Number(point.order)) || fallbackPoint;
}

function createMapMarkup(points, projectedPoints, routePath) {
  return [
    '<div class="story-map" role="img" aria-label="Mapa simple animado del Camino de la Reconquista">',
    '  <div class="story-map__viewport">',
    `    <svg class="story-map__svg" viewBox="0 0 ${VIEWBOX.width} ${VIEWBOX.height}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">`,
    "      <defs>",
    '        <filter id="routeGlow" x="-50%" y="-50%" width="200%" height="200%">',
    '          <feGaussianBlur stdDeviation="4" result="blur"></feGaussianBlur>',
    '          <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>',
    "        </filter>",
    '        <radialGradient id="focusGradient" cx="50%" cy="50%" r="50%">',
    '          <stop offset="0%" stop-color="#f07843" stop-opacity="0.32"></stop>',
    '          <stop offset="72%" stop-color="#f07843" stop-opacity="0.09"></stop>',
    '          <stop offset="100%" stop-color="#f07843" stop-opacity="0"></stop>',
    "        </radialGradient>",
    '        <linearGradient id="mapDepth" x1="0%" y1="0%" x2="100%" y2="0%">',
    '          <stop offset="0%" stop-color="#f3eadf" stop-opacity="0.08"></stop>',
    '          <stop offset="58%" stop-color="#918a80" stop-opacity="0.16"></stop>',
    '          <stop offset="77%" stop-color="#1c292d" stop-opacity="0.42"></stop>',
    '          <stop offset="100%" stop-color="#112027" stop-opacity="0.76"></stop>',
    "        </linearGradient>",
    "      </defs>",
    '      <image class="story-map__base-image" href="/material/current-map-reference.jpg" x="0" y="0" width="1920" height="1080" preserveAspectRatio="xMidYMid slice"></image>',
    '      <rect class="story-map__paper-wash" width="1920" height="1080"></rect>',
    '      <rect class="story-map__depth" width="1920" height="1080"></rect>',
    `      <path class="story-map__route-base" d="${routePath}"></path>`,
    `      <path class="story-map__route-glow" d="${routePath}"></path>`,
    `      <path class="story-map__route-progress" d="${routePath}"></path>`,
    '      <g class="story-map__focuses">',
    ...projectedPoints.map((point, index) => (
      `        <circle class="story-map__focus" data-map-focus="${index}" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="90"></circle>`
    )),
    "      </g>",
    '      <g class="story-map__points">',
    ...points.map((point, index) => {
      const projected = projectedPoints[index];
      return [
        `        <g class="story-map__point" data-map-point="${index}" transform="translate(${projected.x.toFixed(1)} ${projected.y.toFixed(1)})">`,
        '          <circle class="story-map__point-ring" r="37"></circle>',
        '          <circle class="story-map__point-core" r="28"></circle>',
        `          <text class="story-map__point-number" y="8">${point.order}</text>`,
        `          <text class="story-map__point-label" x="30" y="4">${point.municipality}</text>`,
        "        </g>",
      ].join("");
    }),
    "      </g>",
    "    </svg>",
    "  </div>",
    '  <div class="story-map__controls" aria-hidden="true">',
    '    <span>+</span>',
    '    <span>-</span>',
    "  </div>",
    '  <div class="story-map__dots" aria-hidden="true">',
    ...points.map((_, index) => `<span data-map-dot="${index}"></span>`),
    "  </div>",
    "</div>",
  ].join("");
}

export async function createMapController({
  containerId,
  points,
  route,
  statusElement,
}) {
  const container = document.getElementById(containerId);
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

  container.innerHTML = createMapMarkup(points, displayPoints, routePath);

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
    const point = displayPoints[index] || displayPoints[0];
    const compact = isCompactViewport();
    const baseScale = compact ? 1.62 : 1.34;
    const scale = baseScale * userScale;
    const xPercent = (point.x / VIEWBOX.width) * 100;
    const yPercent = (point.y / VIEWBOX.height) * 100;
    const pullX = clamp(50 - xPercent, -16, 16);
    const pullY = clamp(48 - yPercent, -12, 12);

    viewport.style.transitionDuration = instant ? "0ms" : "950ms";
    viewport.style.transformOrigin = `${xPercent}% ${yPercent}%`;
    viewport.style.transform = `translate(${pullX}%, ${pullY}%) scale(${scale})`;
  }

  function updatePointState() {
    const completedIndex = Math.floor(progress * Math.max(points.length - 1, 1));

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
    viewport.style.transitionDuration = "950ms";
    viewport.style.transformOrigin = "50% 50%";
    viewport.style.transform = "translate(0, 0) scale(1)";
  }

  function resize() {
    applyCamera(activeIndex, true);
  }

  container
    .querySelector(".story-map__controls span:first-child")
    ?.addEventListener("click", () => {
      userScale = clamp(userScale + 0.12, 0.9, 1.38);
      applyCamera(activeIndex);
    });

  container
    .querySelector(".story-map__controls span:nth-child(2)")
    ?.addEventListener("click", () => {
      userScale = clamp(userScale - 0.12, 0.9, 1.38);
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
