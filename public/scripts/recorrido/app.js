import { loadExperienceData, padNumber } from "./data.js";
import { createAudioController } from "./audio.js";
import { createMapController } from "./map.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function debounce(callback, wait = 160) {
  let timeoutId = 0;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), wait);
  };
}

function getCounterLabel(index, total) {
  return `${index + 1}/${total}`;
}

function getChapterLabel(point, tourStopCount) {
  if (point?.isHistoricalContinuation) {
    return `${padNumber(point.order)} / continuidad`;
  }

  return getCounterLabel(point.order - 1, tourStopCount);
}

function getRouteProgressForStep(index, total, localProgress = 0.5) {
  if (total <= 1) {
    return 1;
  }

  if (index >= total - 1) {
    return 1;
  }

  const segment = 1 / (total - 1);
  return clamp(index * segment + segment * clamp(localProgress, 0, 1), 0, 1);
}

function getStepLocalProgress(step) {
  if (!step) {
    return 0;
  }

  const rect = step.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const rawProgress = (viewportHeight - rect.top) / (rect.height + viewportHeight);

  return clamp(rawProgress, 0, 1);
}

function getProgressStatus(index, total) {
  if (index === 0) {
    return "Perdriel y Lujan";
  }

  if (index === total - 1) {
    return "Continuidad hacia CABA";
  }

  const labels = [
    "Perdriel y Lujan",
    "Montevideo y la marcha",
    "Encuentro con Liniers",
    "Descanso y auxilio",
    "Rumbo a CABA",
    "Continuidad hacia CABA",
  ];

  return labels[index] || `Tramo ${index + 1} de ${total}`;
}

function createIntroMarkup() {
  return [
    '<article class="story-step story-step--intro is-active" data-intro="true" aria-labelledby="story-title-intro">',
    '  <span class="story-step__marker story-step__marker--intro" aria-hidden="true"><span>i</span></span>',
    '  <div class="story-card story-card--intro">',
    '    <div class="story-card__copy">',
    '      <p class="story-card__kicker">Introduccion</p>',
    '      <h2 class="story-card__title" id="story-title-intro">Bienvenidos al Camino de la Reconquista</h2>',
    '      <p class="story-card__description">5 paradas del recorrido + continuidad hist&oacute;rica hacia CABA. Los n&uacute;meros 1-5 indican el orden del recorrido tur&iacute;stico; la cronolog&iacute;a hist&oacute;rica aparece en la l&iacute;nea de tiempo.</p>',
    "    </div>",
    "  </div>",
    "</article>",
  ].join("");
}

function createStoryNavMarkup(points) {
  return [
    '<nav class="story-nav" aria-label="Navegacion entre puntos del recorrido">',
    '  <ol class="story-nav__list">',
    ...points.map((point, index) => {
      return [
        `    <li class="story-nav__item${point.isHistoricalContinuation ? " story-nav__item--continuation" : ""}">`,
        `      <button class="story-nav__button" type="button" data-jump-index="${index}" aria-label="Ir a ${point.isHistoricalContinuation ? "continuidad historica" : "punto"} ${escapeHtml(point.order)}: ${escapeHtml(point.title)}">`,
        `        <span aria-hidden="true">${point.order}</span>`,
        "      </button>",
        "    </li>",
      ].join("");
    }),
    "  </ol>",
    "</nav>",
  ].join("");
}

function getMicroStory(order) {
  const stories = {
    1: ["Enfrentaron una columna britanica.", "Perdriel queda unido a Lujan."],
    2: ["La chacra sostuvo la marcha.", "Montevideo habia preparado la expedicion."],
    3: ["Aqui se encontraron con Liniers.", "Las Conchas ordeno el avance."],
    4: ["San Isidro dio abrigo.", "La columna recupero fuerzas."],
    5: ["El Fondo de la Legua marco el rumbo.", "La marcha entraba hacia CABA."],
    6: ["Continuidad historica hacia CABA.", "Beresford termino capitulando cerca del Fuerte."],
  };

  return stories[order] || [];
}

function getImpactStory(order) {
  const impacts = {
    1: "Perdriel condensa la resistencia rural: una derrota tactica que se vuelve hito de organizacion y memoria nacional.",
    2: "La escala territorial conecto el auxilio local con la fuerza expedicionaria organizada desde Montevideo.",
    3: "Las Conchas fue el encuentro decisivo con Liniers antes de ordenar el avance hacia Buenos Aires.",
    4: "San Isidro fue una escala para recuperar fuerzas antes de seguir hacia Buenos Aires.",
    5: "Ultimo tramo turistico: desde aqui el relato sigue hacia Chacarita, Miserere, Retiro, la Plaza Mayor y el Fuerte.",
    6: "El desenlace ocurrio en Buenos Aires: tras Chacarita, Miserere y Retiro, las fuerzas llegaron al entorno de la Plaza Mayor y el Fuerte, donde Beresford termino capitulando.",
  };

  return impacts[order] || "";
}

function createMicroStoryMarkup(lines) {
  if (!lines.length) {
    return "";
  }

  return [
    '      <aside class="story-card__micro" aria-label="Clave narrativa">',
    ...lines.map((line) => `        <p>${escapeHtml(line)}</p>`),
    "      </aside>",
  ].join("");
}

function createConnectionMarkup(point) {
  if (!point.connectionLabel && !point.connectionText) {
    return "";
  }
  const connectionLabel = point.connectionLabel
    ? point.connectionLabel.replace(/^Conecta con\s+/i, "Conexi\u00f3n hist\u00f3rica · ")
    : "Conexi\u00f3n hist\u00f3rica";

  return [
    '      <aside class="story-card__connection" aria-label="Conexion historica">',
    `        <p class="story-card__connection-label">${escapeHtml(connectionLabel)}</p>`,
    `        <p class="story-card__connection-text">${escapeHtml(point.connectionText)}</p>`,
    "      </aside>",
  ].join("");
}

function createStoryPictureMarkup(point, index) {
  const sizes = "(max-width: 899px) 92vw, 44vw";
  const imageSet = point.imageSet;
  const avifSource = imageSet.small.avif
    ? `  <source srcset="${escapeHtml(imageSet.small.avif)} 560w, ${escapeHtml(imageSet.medium.avif)} 880w, ${escapeHtml(imageSet.large.avif)} 1200w" sizes="${sizes}" type="image/avif">`
    : "";

  return [
    "<picture>",
    avifSource,
    `  <source srcset="${escapeHtml(imageSet.small.webp)} 560w, ${escapeHtml(imageSet.medium.webp)} 880w, ${escapeHtml(imageSet.large.webp)} 1200w" sizes="${sizes}" type="image/webp">`,
    `  <img src="${escapeHtml(imageSet.medium.jpg)}" srcset="${escapeHtml(imageSet.small.jpg)} 560w, ${escapeHtml(imageSet.medium.jpg)} 880w, ${escapeHtml(imageSet.large.jpg)} 1200w" sizes="${sizes}" alt="${escapeHtml(point.imageAlt)}" width="1200" height="800" loading="${index === 0 ? "eager" : "lazy"}"${index === 0 ? ' fetchpriority="high"' : ""} decoding="async">`,
    "</picture>",
  ].join("");
}

function createAudioPlayerMarkup(id, options = {}) {
  const skipIntroButton = options.canSkipIntro
    ? '<button class="audio-player__skip" type="button" data-audio-action="skip-intro" aria-label="Saltar introduccion">Saltar intro</button>'
    : "";

  return [
    `<div class="audio-player${options.compact ? " audio-player--compact" : ""}" id="${id}" data-audio-player="${id}"${options.hidden ? " hidden" : ""}>`,
    '  <div class="audio-player__topline">',
    `    <p class="audio-player__eyebrow">${escapeHtml(options.eyebrow || "Audio")}</p>`,
    '    <p class="audio-player__status" data-audio-status aria-live="polite">Listo para escuchar</p>',
    "  </div>",
    '  <div class="audio-player__body" data-audio-slot></div>',
    '  <div class="audio-player__actions">',
    skipIntroButton,
    '    <button class="audio-player__close" type="button" data-audio-action="close" aria-label="Cerrar reproductor de audio">Cerrar audio</button>',
    "  </div>",
    "</div>",
  ].join("");
}

function createStoryMarkup(point, index, total) {
  const microStory = getMicroStory(point.order);
  const impactStory = getImpactStory(point.order);
  const pointRole = point.isHistoricalContinuation
    ? "Continuidad historica hacia CABA"
    : `Punto ${point.order}`;
  const locationLabel = point.isHistoricalContinuation
    ? "Referencia en mapas"
    : "Ubicacion";
  const actionLabel = point.isHistoricalContinuation
    ? "Escuchar relato de continuidad"
    : `Escuchar punto ${point.order}`;
  const audioEyebrow = point.isHistoricalContinuation
    ? "Continuidad 06"
    : `Punto ${point.order}`;

  return [
    `<article class="story-step${point.isHistoricalContinuation ? " story-step--continuation" : ""}" id="step-${point.order}" data-index="${index}" data-point-type="${escapeHtml(point.type)}" aria-labelledby="story-title-${point.id}">`,
    '  <div class="story-card">',
    '    <div class="story-card__copy">',
    '      <div class="story-card__topline">',
    `        <span class="story-card__ordinal">${padNumber(point.order)}</span>`,
    `        <span class="story-card__kicker">${escapeHtml(pointRole)}</span>`,
    "      </div>",
    point.badge ? `      <p class="story-card__badge">${escapeHtml(point.badge)}</p>` : "",
    `      <h2 class="story-card__title" id="story-title-${point.id}">${escapeHtml(point.title)}</h2>`,
    '      <div class="story-card__block story-card__block--place">',
    '        <p class="story-card__label">Lugar</p>',
    `        <p class="story-card__place">${escapeHtml(point.place)}</p>`,
    "      </div>",
    '      <div class="story-card__block">',
    '        <p class="story-card__label">Qu\u00e9 ocurri\u00f3</p>',
    `        <p class="story-card__description">${escapeHtml(point.description)}</p>`,
    "      </div>",
    createConnectionMarkup(point),
    point.mapReference ? [
      '      <aside class="story-card__reference" aria-label="Referencia cartografica">',
      `        <p>${escapeHtml(point.mapReference)}</p>`,
      "      </aside>",
    ].join("") : "",
    createMicroStoryMarkup(microStory),
    impactStory ? [
      '      <div class="story-card__block story-card__block--impact">',
      `        <p class="story-card__label">${point.isHistoricalContinuation ? "Hito de continuidad" : "En el recorrido"}</p>`,
      `        <p class="story-card__impact">${escapeHtml(impactStory)}</p>`,
      "      </div>",
    ].join("") : "",
    '      <div class="story-card__actions">',
    `        <button class="chapter-button" type="button" data-audio-point="${index}" aria-expanded="false" aria-controls="audio-point-${point.order}">${actionLabel}</button>`,
    "      </div>",
    `      ${createAudioPlayerMarkup(`audio-point-${point.order}`, { eyebrow: audioEyebrow, canSkipIntro: true, hidden: true })}`,
    `      <a class="chapter-link story-card__location-link" href="${escapeHtml(point.mapUrl)}" target="_blank" rel="noreferrer noopener"${point.isHistoricalContinuation ? ' aria-label="Ver referencia territorial actual de Chacarita en mapas"' : ""}>${locationLabel}</a>`,
    "    </div>",
    '    <figure class="story-card__figure">',
    `      ${createStoryPictureMarkup(point, index)}`,
    "    </figure>",
    "  </div>",
    "</article>",
  ].join("");
}

function createListMarkup(points, className) {
  return points
    .map((point, index) => {
      return [
        `<button class="${className}${point.isHistoricalContinuation ? ` ${className}--continuation` : ""}" type="button" data-jump-index="${index}">`,
        `  <span class="${className}__count">${padNumber(point.order)}</span>`,
        `  <span class="${className}__body">`,
        `    <strong class="${className}__title">${escapeHtml(point.title)}</strong>`,
        `    <span class="${className}__meta">${escapeHtml(point.isHistoricalContinuation ? "Continuidad historica hacia CABA | Fuera del recorrido turistico" : `${point.place} | ${point.municipality}`)}</span>`,
        "  </span>",
        "</button>",
      ].join("");
    })
    .join("");
}

const TIMELINE_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

window.addEventListener("DOMContentLoaded", async () => {
  const dom = {
    storySections: document.getElementById("story-sections"),
    overviewList: document.getElementById("overview-list"),
    timelineList: document.getElementById("timeline-list"),
    chapterCount: document.getElementById("chapter-count"),
    chapterMunicipality: document.getElementById("chapter-municipality"),
    activeTitle: document.getElementById("active-title"),
    activePlace: document.getElementById("active-place"),
    progressStatus: document.getElementById("progress-status"),
    routeProgressFill: document.getElementById("route-progress-fill"),
    mapsLink: document.getElementById("maps-link"),
    timelinePanel: document.getElementById("timeline-panel"),
    timelineBackdrop: document.getElementById("timeline-backdrop"),
    timelineOpenButtons: [
      document.getElementById("timeline-open"),
      document.getElementById("timeline-toggle-bottom"),
    ].filter(Boolean),
    timelineClose: document.getElementById("timeline-close"),
    mapStatus: document.getElementById("map-status"),
    mapReset: document.getElementById("map-reset"),
    heroPlayer: document.getElementById("hero-audio-player"),
    plyrDock: document.getElementById("plyr-dock"),
    audioElement: document.getElementById("shared-audio"),
    audioSticky: document.getElementById("audio-sticky"),
    audioStickyTitle: document.getElementById("audio-sticky-title"),
    audioStickyProgress: document.getElementById("audio-sticky-progress"),
    audioStickyToggle: document.querySelector("[data-sticky-audio-toggle]"),
    audioStickyClose: document.querySelector("[data-sticky-audio-close]"),
  };

  const data = await loadExperienceData();
  const totalPoints = data.points.length;
  const tourStopCount = data.points.filter((point) => point.isTourStop).length;

  dom.storySections.innerHTML = [
    createStoryNavMarkup(data.points),
    createIntroMarkup(),
    data.points
      .map((point, index) => createStoryMarkup(point, index, totalPoints))
      .join(""),
  ].join("");
  if (dom.overviewList) {
    dom.overviewList.innerHTML = createListMarkup(data.points, "overview-card");
  }
  dom.timelineList.innerHTML = createListMarkup(data.points, "timeline-item");
  document.body.dataset.activeIndex = "intro";


  const chapterButtons = Array.from(
    dom.storySections.querySelectorAll("[data-audio-point]"),
  );
  chapterButtons.forEach((button) => {
    const point = data.points[Number(button.dataset.audioPoint)];
    button.dataset.defaultLabel = point.isHistoricalContinuation
      ? "Escuchar relato de continuidad"
      : `Escuchar punto ${point.order}`;
    button.dataset.available = String(point.audio.available);
  });

  const audioController = createAudioController({
    audioElement: dom.audioElement,
    onStateChange: syncAudioUi,
  });
  const plyrPlayer = window.Plyr
    ? new window.Plyr(dom.audioElement, {
        controls: ["play", "progress", "current-time", "duration", "settings"],
        settings: ["speed"],
        speed: { selected: 1, options: [1, 1.25, 1.5] },
        invertTime: false,
        displayDuration: true,
        iconUrl: "/vendor/plyr/plyr.svg",
        storage: { enabled: false },
        tooltips: { controls: true, seek: true },
        keyboard: { focused: true, global: false },
        i18n: {
          play: "Reproducir",
          pause: "Pausar",
          mute: "Silenciar",
          unmute: "Activar sonido",
          settings: "Ajustes",
          speed: "Velocidad",
          normal: "Normal",
        },
      })
    : null;
  const plyrElement = dom.plyrDock.querySelector(".plyr") || dom.audioElement;

  const mapController = await createMapController({
    containerId: "map",
    points: data.points,
    route: data.route,
    statusElement: dom.mapStatus,
  });

  const state = {
    activeIndex: -1,
    routeProgress: 0,
    openPlayerId: null,
  };
  let lastTimelineTrigger = null;

  const storySteps = Array.from(document.querySelectorAll(".story-step[data-index]"));
  const introStep = document.querySelector(".story-step--intro");

  function getActivePoint() {
    return data.points[state.activeIndex];
  }

  function updateRouteProgress(progress) {
    state.routeProgress = progress;
    dom.routeProgressFill.style.transform = `scaleX(${progress})`;
    mapController.setRouteProgress(progress);
  }

  function syncAudioUi(audioState) {
    const activeTrackId = audioState.trackId;
    const hasOpenAudio = Boolean(state.openPlayerId && activeTrackId);
    document.body.classList.toggle(
      "audio-point-open",
      Boolean(state.openPlayerId && state.openPlayerId !== data.heroAudio.id),
    );
    document.body.classList.toggle("audio-sticky-open", hasOpenAudio);

    chapterButtons.forEach((button) => {
      const point = data.points[Number(button.dataset.audioPoint)];
      const isActiveTrack = activeTrackId === point.audio.id;
      const panel = document.getElementById(button.getAttribute("aria-controls"));
      const isOpen = state.openPlayerId === point.audio.id;
      const locationLink = panel?.nextElementSibling;

      button.disabled = button.dataset.available !== "true";
      button.textContent = isActiveTrack && audioState.isPlaying
        ? "Pausar audio"
        : button.dataset.defaultLabel;
      button.setAttribute("aria-expanded", String(isOpen));
      button.classList.toggle("is-audio-open", isOpen);
      button.tabIndex = isOpen ? -1 : 0;
      button.setAttribute("aria-hidden", String(isOpen));
      if (panel) {
        panel.hidden = false;
        panel.classList.toggle("is-open", isOpen);
      }
      if (locationLink?.classList.contains("story-card__location-link")) {
        locationLink.classList.toggle("is-audio-open", isOpen);
      }
    });

    document.querySelectorAll("[data-audio-player]").forEach((player) => {
      const isHero = player.id === "hero-audio-player";
      const isActivePlayer =
        (isHero && activeTrackId === data.heroAudio.id)
        || (!isHero && player.id === `audio-point-${audioState.pointId}`);

      syncAudioPlayer(player, isActivePlayer ? audioState : null);
    });

    syncStickyAudio(audioState, hasOpenAudio);
  }

  function getStickyAudioTitle(audioState) {
    if (audioState.trackId === data.heroAudio.id) {
      return "Relato completo";
    }

    const point = data.points.find((item) => item.audio.id === audioState.trackId);
    if (!point) {
      return "Relato";
    }

    return point.isHistoricalContinuation
      ? `Continuidad hist\u00f3rica - ${point.title}`
      : `Punto ${point.order} - ${point.title}`;
  }

  function syncStickyAudio(audioState, hasOpenAudio) {
    if (!dom.audioSticky) {
      return;
    }

    dom.audioSticky.hidden = !hasOpenAudio;
    if (!hasOpenAudio) {
      return;
    }

    const progress = audioState.duration > 0
      ? Math.min(1, Math.max(0, audioState.currentTime / audioState.duration))
      : 0;

    dom.audioStickyTitle.textContent = getStickyAudioTitle(audioState);
    dom.audioStickyProgress.style.transform = `scaleX(${progress})`;
    dom.audioStickyToggle.classList.toggle("is-playing", audioState.isPlaying);
    dom.audioStickyToggle.setAttribute(
      "aria-label",
      audioState.isPlaying ? "Pausar audio" : "Reproducir audio",
    );
  }

  function syncAudioPlayer(player, audioState) {
    const stateForPlayer = audioState || createEmptyAudioState();
    const isPlaying = stateForPlayer.isPlaying;
    const status = getAudioStatusLabel(stateForPlayer);

    player.querySelector("[data-audio-status]").textContent = status;

    const toggle = player.querySelector('[data-audio-action="toggle"]');
    if (player.id === "hero-audio-player") {
      const statusText = toggle.querySelector("[data-audio-status]");
      if (statusText) {
        statusText.textContent = isPlaying ? "Pausar relato completo" : "Escuchar relato completo";
      }
      toggle.setAttribute(
        "aria-label",
        isPlaying ? "Pausar relato completo" : "Reproducir relato completo",
      );
      toggle.classList.toggle("is-playing", isPlaying);
      toggle.disabled = !data.heroAudio.available;
    }

    const skipIntro = player.querySelector('[data-audio-action="skip-intro"]');
    if (skipIntro) {
      skipIntro.hidden = !stateForPlayer.canSkipIntro;
      skipIntro.disabled = !audioState;
    }

    const closeAudio = player.querySelector('[data-audio-action="close"]');
    if (closeAudio) {
      closeAudio.disabled = !audioState;
    }
  }

  function createEmptyAudioState() {
    return {
      currentTime: 0,
      duration: 0,
      playbackRate: 1,
      status: "idle",
      loading: false,
      isPlaying: false,
      error: "",
      canSkipIntro: false,
    };
  }

  function getAudioStatusLabel(audioState) {
    if (audioState.error) {
      return audioState.error;
    }

    if (audioState.loading || audioState.status === "loading") {
      return "Cargando audio";
    }

    if (audioState.status === "ended") {
      return "Audio finalizado";
    }

    if (audioState.isPlaying) {
      return "Reproduciendo";
    }

    return "Listo para escuchar";
  }

  function openPointPlayer(index) {
    const point = data.points[index];

    if (!point?.audio?.available) {
      return;
    }

    state.openPlayerId = point.audio.id;
    audioController.setTrack(point.audio);
    mountPlyrForPoint(point);
    audioController.togglePlayback();
    syncAudioUi(audioController.getState());

    if (window.matchMedia("(max-width: 899px)").matches) {
      window.setTimeout(() => {
        const panel = document.getElementById(`audio-point-${point.order}`);
        const mapStage = document.querySelector(".map-stage");
        const mapBottom = mapStage?.getBoundingClientRect().bottom || 0;
        const targetTop = Math.min(mapBottom + 12, window.innerHeight - 260);

        if (panel) {
          window.scrollBy({
            top: panel.getBoundingClientRect().top - targetTop,
            behavior: "smooth",
          });
        }
      }, 80);
    }
  }

  function closePointPlayer() {
    audioController.pause();
    state.openPlayerId = null;
    syncAudioUi(audioController.getState());
  }

  function mountPlyrForPoint(point) {
    const slot = document.querySelector(`#audio-point-${point.order} [data-audio-slot]`);

    if (slot && plyrElement.parentElement !== slot) {
      slot.appendChild(plyrElement);
    }
  }

  function updateTimelineState(index) {
    document
      .querySelectorAll("[data-jump-index]")
      .forEach((button) => {
        const isActive = Number(button.dataset.jumpIndex) === index;
        button.classList.toggle("is-active", isActive);
        if (isActive) {
          button.setAttribute("aria-current", "step");
        } else {
          button.removeAttribute("aria-current");
        }
      });
  }

  function updateStoryState(index) {
    document.body.dataset.activeIndex = String(index);

    dom.storySections
      .querySelector(".story-step--intro")
      ?.classList.remove("is-active");

    dom.storySections.querySelectorAll(".story-step").forEach((step) => {
      const isActive = Number(step.dataset.index) === index;
      step.classList.toggle("is-active", isActive);
      if (isActive) {
        step.setAttribute("aria-current", "step");
      } else {
        step.removeAttribute("aria-current");
      }
    });
  }

  function updateIntroState() {
    if (state.activeIndex === -1 && document.body.dataset.activeIndex === "intro") {
      return;
    }

    state.activeIndex = -1;
    document.body.dataset.activeIndex = "intro";

    dom.storySections.querySelectorAll(".story-step").forEach((step) => {
      const isIntroStep = step.classList.contains("story-step--intro");
      step.classList.toggle("is-active", isIntroStep);
      if (isIntroStep) {
        step.setAttribute("aria-current", "step");
      } else {
        step.removeAttribute("aria-current");
      }
    });

    dom.chapterCount.textContent = "Recorrido";
    dom.chapterMunicipality.textContent = "continuidad";
    dom.activeTitle.textContent = "Bienvenidos al Camino de la Reconquista";
    dom.activePlace.textContent = "Una lectura guiada por los hitos de 1806";
    document.getElementById("map-panel-label").textContent = "Mapa del Camino";
    dom.progressStatus.textContent = "Vista general del recorrido";
    dom.mapsLink.href = "https://www.google.com/maps";
    dom.mapsLink.textContent = "Ubicaci\u00f3n";
    dom.mapsLink.removeAttribute("aria-label");
    dom.routeProgressFill.style.transform = "scaleX(0)";
    mapController.resetOverview({ clearActive: true });
    updateTimelineState(-1);
  }

  function updatePrimaryState(index, options = {}) {
    const isIntroActive = document.body.dataset.activeIndex === "intro";

    if (state.activeIndex === index && !options.force && !isIntroActive) {
      return;
    }

    state.activeIndex = index;
    const point = getActivePoint();
    const activeStep = storySteps[index];
    const localProgress =
      typeof options.localProgress === "number"
        ? options.localProgress
        : getStepLocalProgress(activeStep);
    const nextRouteProgress =
      typeof options.routeProgress === "number"
        ? options.routeProgress
        : getRouteProgressForStep(index, totalPoints, localProgress);

    dom.chapterCount.textContent = getChapterLabel(point, tourStopCount);
    dom.chapterMunicipality.textContent = point.municipality;
    dom.activeTitle.textContent = point.title;
    dom.activePlace.textContent = point.place;
    document.getElementById("map-panel-label").textContent = point.isHistoricalContinuation
      ? "Continuidad hist\u00f3rica"
      : "Mapa del Camino";
    dom.progressStatus.textContent = getProgressStatus(index, totalPoints);
    dom.mapsLink.href = point.mapUrl;
    dom.mapsLink.textContent = point.isHistoricalContinuation ? "Referencia en mapas" : "Ubicaci\u00f3n";
    if (point.isHistoricalContinuation) {
      dom.mapsLink.setAttribute("aria-label", "Ver referencia territorial actual de Chacarita en mapas");
    } else {
      dom.mapsLink.removeAttribute("aria-label");
    }

    updateStoryState(index);
    updateTimelineState(index);
    updateRouteProgress(nextRouteProgress);
    mapController.setActivePoint(index, {
      instant: options.instantMap,
      progress: nextRouteProgress,
    });
  }

  function openTimeline(trigger = document.activeElement) {
    lastTimelineTrigger = trigger instanceof HTMLElement ? trigger : null;
    dom.timelinePanel.hidden = false;
    dom.timelineBackdrop.hidden = false;
    document.body.classList.add("timeline-open");
    dom.timelineOpenButtons.forEach((button) => {
      button.setAttribute("aria-expanded", "true");
    });
    dom.timelineClose.focus();
  }

  function closeTimeline() {
    dom.timelinePanel.hidden = true;
    dom.timelineBackdrop.hidden = true;
    document.body.classList.remove("timeline-open");
    dom.timelineOpenButtons.forEach((button) => {
      button.setAttribute("aria-expanded", "false");
    });
    lastTimelineTrigger?.focus();
    lastTimelineTrigger = null;
  }

  function trapTimelineFocus(event) {
    if (event.key !== "Tab" || dom.timelinePanel.hidden) {
      return;
    }

    const focusable = Array.from(
      dom.timelinePanel.querySelectorAll(TIMELINE_FOCUSABLE_SELECTOR),
    ).filter((element) => element.offsetParent !== null);

    if (!focusable.length) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function scrollToStep(index, behavior = "smooth") {
    const step = document.querySelector(`.story-step[data-index="${index}"]`);
    if (!step) {
      return;
    }

    step.scrollIntoView({
      behavior,
      block: window.matchMedia("(max-width: 899px)").matches ? "start" : "center",
    });
  }

  function handleStepSelection(index) {
    closeTimeline();
    updatePrimaryState(index, { force: true });
    scrollToStep(index);
  }

  function handleSeek(inputElement) {
    audioController.seekByRatio(Number(inputElement.value) / 1000);
  }

  function getTrackForPlayer(player) {
    if (player.id === "hero-audio-player") {
      return data.heroAudio;
    }

    const point = data.points.find(
      (item) => player.id === `audio-point-${item.order}`,
    );

    return point?.audio || null;
  }

  function handleAudioAction(event) {
    const actionControl = event.target.closest("[data-audio-action], [data-audio-rate]");
    const player = event.target.closest("[data-audio-player]");

    if (!actionControl || !player) {
      return false;
    }

    const track = getTrackForPlayer(player);
    if (track && audioController.getState().trackId !== track.id) {
      state.openPlayerId = track.id;
      audioController.setTrack(track);
    }

    if (actionControl.dataset.audioRate) {
      audioController.setPlaybackRate(Number(actionControl.dataset.audioRate));
      return true;
    }

    switch (actionControl.dataset.audioAction) {
      case "toggle":
        state.openPlayerId = data.heroAudio.id;
        audioController.togglePlayback();
        break;
      case "skip-intro":
        audioController.skipIntro();
        break;
      case "close":
        closePointPlayer();
        break;
      case "seek":
        handleSeek(actionControl);
        break;
      default:
        return false;
    }

    return true;
  }

  function syncRouteProgressToScroll() {
    if (state.activeIndex < 0) {
      return;
    }

    const activeStep = storySteps[state.activeIndex];
    const localProgress = getStepLocalProgress(activeStep);
    updateRouteProgress(getRouteProgressForStep(state.activeIndex, totalPoints, localProgress));
  }

  function getCenteredVisibleStep() {
    const steps = [introStep, ...storySteps].filter(Boolean);
    const viewportCenter = (window.innerHeight || document.documentElement.clientHeight) / 2;

    return steps.reduce((best, step) => {
      const rect = step.getBoundingClientRect();
      const isVisible = rect.bottom > 0 && rect.top < window.innerHeight;

      if (!isVisible) {
        return best;
      }

      const stepCenter = rect.top + rect.height / 2;
      const distance = Math.abs(stepCenter - viewportCenter);

      if (!best || distance < best.distance) {
        return { step, distance };
      }

      return best;
    }, null)?.step;
  }

  function activateStep(step, options = {}) {
    if (!step) {
      return;
    }

    if (step.dataset.intro === "true") {
      updateIntroState();
      return;
    }

    const index = Number(step.dataset.index);

    if (!Number.isFinite(index)) {
      return;
    }

    updatePrimaryState(index, options);
  }

  let scrollFrame = 0;
  function requestScrollSync() {
    if (scrollFrame) {
      return;
    }

    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      syncRouteProgressToScroll();

      if (!("IntersectionObserver" in window)) {
        activateStep(getCenteredVisibleStep());
      }
    });
  }

  dom.storySections.addEventListener("click", (event) => {
    if (handleAudioAction(event)) {
      return;
    }

    const jumpButton = event.target.closest("[data-jump-index]");
    if (jumpButton) {
      handleStepSelection(Number(jumpButton.dataset.jumpIndex));
      return;
    }

    const audioButton = event.target.closest("[data-audio-point]");

    if (audioButton) {
      const index = Number(audioButton.dataset.audioPoint);
      if (index !== state.activeIndex) {
        updatePrimaryState(index);
      }
      openPointPlayer(index);
    }
  });

  dom.storySections.addEventListener("input", (event) => {
    if (event.target.matches('[data-audio-action="seek"]')) {
      handleSeek(event.target);
    }
  });

  dom.heroPlayer?.addEventListener("click", (event) => {
    handleAudioAction(event);
  });

  dom.heroPlayer?.addEventListener("input", (event) => {
    if (event.target.matches('[data-audio-action="seek"]')) {
      handleSeek(event.target);
    }
  });

  dom.audioStickyToggle?.addEventListener("click", () => {
    audioController.togglePlayback();
  });

  dom.audioStickyClose?.addEventListener("click", () => {
    closePointPlayer();
  });

  [dom.overviewList, dom.timelineList].filter(Boolean).forEach((container) => {
    container.addEventListener("click", (event) => {
      const target = event.target.closest("[data-jump-index]");
      if (!target) {
        return;
      }

      handleStepSelection(Number(target.dataset.jumpIndex));
    });
  });

  dom.timelineOpenButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (dom.timelinePanel.hidden) {
        openTimeline(button);
        return;
      }

      closeTimeline();
    });
  });

  dom.timelineClose.addEventListener("click", closeTimeline);
  dom.timelineBackdrop.addEventListener("click", closeTimeline);
  dom.mapReset.addEventListener("click", () => mapController.resetOverview());

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dom.timelinePanel.hidden) {
      closeTimeline();
      return;
    }

    trapTimelineFocus(event);
  });

  if ("IntersectionObserver" in window) {
    const activeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          activateStep(entry.target, {
            routeProgress:
              entry.target.dataset.intro === "true"
                ? 0
                : getRouteProgressForStep(
                    Number(entry.target.dataset.index),
                    totalPoints,
                    getStepLocalProgress(entry.target),
                  ),
          });
        });
      },
      {
        root: null,
        rootMargin: "-45% 0px -45% 0px",
        threshold: 0,
      },
    );

    [introStep, ...storySteps].filter(Boolean).forEach((step) => {
      activeObserver.observe(step);
    });
  }

  window.addEventListener("scroll", requestScrollSync, { passive: true });

  const handleResize = debounce(() => {
    mapController.resize();
    activateStep(getCenteredVisibleStep(), { force: true, instantMap: true });
    requestScrollSync();
  }, 120);

  window.addEventListener("resize", handleResize);

  audioController.setTrack(data.heroAudio);
  updatePrimaryState(0, { force: true, instantMap: true, routeProgress: 0 });
  updateIntroState();
  syncAudioUi(audioController.getState());
});
