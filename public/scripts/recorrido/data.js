const POINTS_URL = "/data/points.geojson";
const ROUTE_URL = "/data/route.geojson";
const PODCAST_URL = "/data/podcast.json";

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

function normalizeAudioItem(item, fallbackTitle = "") {
  const source = stripPublicPrefix(item?.audio || "");
  const available = Boolean(item?.available && source);

  return {
    title: item?.title || fallbackTitle,
    src: source,
    available,
    durationSeconds: Number(item?.duration ?? 0) || 0,
  };
}

function createSegment(audio, role) {
  return {
    role,
    title: audio.title,
    src: audio.src,
    durationSeconds: audio.durationSeconds,
  };
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
  const introAudio = podcastIndex.intro;
  const closingAudio = podcastIndex.closing;
  const pointAudio = normalizeAudioItem(
    podcast || {
      audio: properties.audio,
      duration: properties.duration,
      available: properties.hasAudio,
    },
    `Audio del punto ${padNumber(order)}`,
  );
  const segments = [
    introAudio?.available ? createSegment(introAudio, "intro") : null,
    pointAudio.available ? createSegment(pointAudio, "main") : null,
    podcast?.includeClosing && closingAudio?.available
      ? createSegment(closingAudio, "closing")
      : null,
  ].filter(Boolean);
  const audioAvailable = segments.length > 0 && pointAudio.available;

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
    connectionLabel: properties.connectionLabel?.trim() || "",
    connectionText: properties.connectionText?.trim() || "",
    mapLabel: properties.mapLabel?.trim() || "",
    image: getPremiumIllustration(order).large.avif,
    imageSet: getPremiumIllustration(order),
    imageAlt: properties.imageAlt?.trim() || `Ilustracion de ${properties.place || properties.title || `Punto ${order}`}`,
    coordinates,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${coordinates[1]},${coordinates[0]}`,
    audio: {
      id: `point-${id}`,
      type: "point",
      pointId: id,
      title: podcast?.title || `Audio del punto ${padNumber(order)}`,
      src: pointAudio.src,
      available: audioAvailable,
      segments,
      durationSeconds: segments.reduce(
        (total, segment) => total + segment.durationSeconds,
        0,
      ),
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
    fetchJson(POINTS_URL),
    fetchJson(ROUTE_URL),
    fetchJson(PODCAST_URL).catch(() => ({ items: [] })),
  ]);

  const podcastIndex = getPodcastIndex(podcastCollection);
  podcastIndex.hero = normalizeAudioItem(podcastCollection.hero, "Camino de la Reconquista");
  podcastIndex.intro = normalizeAudioItem(podcastCollection.intro, "Introduccion");
  podcastIndex.closing = normalizeAudioItem(podcastCollection.closing, "Cierre");
  const points = [...(pointsCollection?.features ?? [])]
    .map((feature) => normalizePoint(feature, podcastIndex))
    .sort((left, right) => left.order - right.order);

  return {
    heroAudio: {
      id: "hero",
      type: "hero",
      title: podcastIndex.hero.title,
      available: podcastIndex.hero.available,
      segments: podcastIndex.hero.available
        ? [createSegment(podcastIndex.hero, "main")]
        : [],
      durationSeconds: podcastIndex.hero.durationSeconds,
    },
    points,
    route: normalizeRoute(routeCollection),
    pointsFeatureCollection: buildPointsFeatureCollection(points),
  };
}
