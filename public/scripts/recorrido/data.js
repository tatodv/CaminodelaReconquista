const POINTS_URLS = ["/data/points.geojson", "/public/data/points.geojson"];
const ROUTE_URLS = ["/data/route.geojson", "/public/data/route.geojson"];
const PODCAST_URLS = ["/data/podcast.json", "/public/data/podcast.json"];

export function padNumber(value) {
  return String(value).padStart(2, "0");
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`No se pudo cargar ${url} (${response.status})`);
  }

  return response.json();
}

async function fetchFirstJson(urls) {
  let lastError;

  for (const url of urls) {
    try {
      return await fetchJson(url);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function stripPublicPrefix(path) {
  return String(path || "").replace(/^\/public\//, "/");
}

function getIllustrationVariant(name) {
  return {
    avif: `/images/points/${name}.avif`,
    webp: `/images/points/${name}.webp`,
    jpg: `/images/points/${name}.jpg`,
  };
}

function getPremiumIllustration(order) {
  return {
    small: getIllustrationVariant(`punto${order}-560`),
    medium: getIllustrationVariant(`punto${order}-880`),
    large: getIllustrationVariant(`punto${order}`),
  };
}

function getPodcastIndex(podcastData) {
  const index = new Map();
  const items = Array.isArray(podcastData?.items) ? podcastData.items : [];

  items.forEach((item) => {
    const pointId = Number(item.pointId);

    if (!Number.isFinite(pointId)) {
      return;
    }

    index.set(pointId, item);
  });

  return index;
}

function normalizePoint(feature, podcastIndex) {
  const properties = feature?.properties ?? {};
  const geometry = feature?.geometry ?? {};
  const coordinates = Array.isArray(geometry.coordinates)
    ? geometry.coordinates.map(Number)
    : [0, 0];

  const order = Number(properties.order ?? properties.id ?? 0);
  const id = Number(properties.id ?? order);
  const podcast = podcastIndex.get(id);
  const audioSource = stripPublicPrefix(podcast?.audio || properties.audio || "");
  const audioAvailable = Boolean(podcast?.available ?? properties.hasAudio);

  return {
    id,
    order,
    slug: properties.slug || `punto-${order}`,
    rawName: properties.rawName || properties.title || `Punto ${order}`,
    title: properties.title || properties.place || `Punto ${order}`,
    place: properties.place || properties.title || "",
    municipality: properties.municipality || "",
    description:
      properties.description?.trim() || "Texto curatorial pendiente de carga.",
    image: getPremiumIllustration(order).large.avif,
    imageSet: getPremiumIllustration(order),
    imageAlt: properties.imageAlt?.trim() || `Ilustracion de ${properties.place || properties.title || `Punto ${order}`}`,
    coordinates,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${coordinates[1]},${coordinates[0]}`,
    audio: {
      title: podcast?.title || `Audio del punto ${padNumber(order)}`,
      src: audioSource,
      available: audioAvailable,
      durationSeconds: Number(podcast?.duration ?? properties.duration ?? 0) || 0,
      note:
        podcast?.note ||
        (audioAvailable ? "" : "Audio disponible proximamente."),
    },
  };
}

function normalizeRoute(routeCollection) {
  const feature = routeCollection?.features?.find(
    (candidate) => candidate?.geometry?.type === "LineString",
  );

  if (!feature) {
    throw new Error("No se encontro una geometria de ruta valida.");
  }

  return feature;
}

function buildPointsFeatureCollection(points) {
  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      properties: {
        id: point.id,
        order: point.order,
        title: point.title,
        municipality: point.municipality,
      },
      geometry: {
        type: "Point",
        coordinates: point.coordinates,
      },
    })),
  };
}

export async function loadExperienceData() {
  const [pointsCollection, routeCollection, podcastCollection] = await Promise.all([
    fetchFirstJson(POINTS_URLS),
    fetchFirstJson(ROUTE_URLS),
    fetchFirstJson(PODCAST_URLS).catch(() => ({ items: [] })),
  ]);

  const podcastIndex = getPodcastIndex(podcastCollection);
  const points = [...(pointsCollection?.features ?? [])]
    .map((feature) => normalizePoint(feature, podcastIndex))
    .sort((left, right) => left.order - right.order);

  return {
    points,
    route: normalizeRoute(routeCollection),
    pointsFeatureCollection: buildPointsFeatureCollection(points),
  };
}
