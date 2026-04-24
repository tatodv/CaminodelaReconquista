const VIEWBOX = {
  width: 1000,
  height: 760,
  paddingX: 115,
  paddingY: 92,
};

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

function createRoadPath(seed, offsetX = 0, offsetY = 0) {
  return seed
    .map((point, index) => {
      const x = point[0] + offsetX;
      const y = point[1] + offsetY;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function getPointProgress(index, total) {
  if (total <= 1) {
    return 1;
  }

  return index / (total - 1);
}

function createMapMarkup(points, projectedPoints, routePath) {
  const roadSeeds = [
    [[65, 640], [190, 548], [318, 516], [454, 444], [612, 398], [804, 320], [946, 242]],
    [[108, 220], [254, 290], [366, 378], [520, 500], [650, 598], [838, 676]],
    [[52, 458], [174, 432], [320, 426], [482, 386], [652, 340], [898, 344]],
    [[248, 80], [316, 206], [380, 330], [444, 468], [500, 672]],
    [[620, 70], [608, 174], [644, 284], [706, 430], [724, 624]],
    [[808, 112], [764, 204], [742, 324], [768, 482], [848, 640]],
  ];

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
    "      </defs>",
    '      <rect class="story-map__land" width="1000" height="760"></rect>',
    '      <path class="story-map__river" d="M775 0 C720 130 790 205 770 335 C752 448 830 550 790 760 L1000 760 L1000 0 Z"></path>',
    '      <g class="story-map__roads">',
    ...roadSeeds.flatMap((seed, index) => [
      `        <path d="${createRoadPath(seed)}"></path>`,
      `        <path d="${createRoadPath(seed, index % 2 ? 46 : -38, index % 2 ? 20 : -24)}"></path>`,
    ]),
    "      </g>",
    '      <g class="story-map__place-labels">',
    '        <text x="175" y="620">San Mart&iacute;n</text>',
    '        <text x="370" y="520">Villa Adelina</text>',
    '        <text x="505" y="430">Boulogne</text>',
    '        <text x="610" y="335">San Isidro</text>',
    '        <text x="470" y="185">San Fernando</text>',
    '        <text x="345" y="118">Tigre</text>',
    '        <text x="735" y="508">Olivos</text>',
    '        <text x="706" y="590">Vicente L&oacute;pez</text>',
    "      </g>",
    `      <path class="story-map__route-base" d="${routePath}"></path>`,
    `      <path class="story-map__route-glow" d="${routePath}"></path>`,
    `      <path class="story-map__route-progress" d="${routePath}"></path>`,
    '      <g class="story-map__focuses">',
    ...projectedPoints.map((point, index) => (
      `        <circle class="story-map__focus" data-map-focus="${index}" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="54"></circle>`
    )),
    "      </g>",
    '      <g class="story-map__points">',
    ...points.map((point, index) => {
      const projected = projectedPoints[index];
      return [
        `        <g class="story-map__point" data-map-point="${index}" transform="translate(${projected.x.toFixed(1)} ${projected.y.toFixed(1)})">`,
        '          <circle class="story-map__point-ring" r="21"></circle>',
        '          <circle class="story-map__point-core" r="16"></circle>',
        `          <text class="story-map__point-number" y="5">${point.order}</text>`,
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
  const routePath = createRoutePath(projectedRoute);

  container.innerHTML = createMapMarkup(points, projectedPoints, routePath);

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
    const point = projectedPoints[index] || projectedPoints[0];
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
    setRouteProgress(Math.max(progress, getPointProgress(activeIndex, points.length)));
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
