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
    return "Primer tramo del recorrido";
  }

  if (index === total - 1) {
    return "Llegada y cierre del recorrido";
  }

  return `Tramo ${index + 1} de ${total}`;
}

function createIntroMarkup() {
  return [
    '<article class="story-step story-step--intro is-active" data-intro="true" aria-labelledby="story-title-intro">',
    '  <span class="story-step__marker story-step__marker--intro" aria-hidden="true"><span>i</span></span>',
    '  <div class="story-card story-card--intro">',
    '    <div class="story-card__copy">',
    '      <p class="story-card__kicker">Introduccion</p>',
    '      <h2 class="story-card__title" id="story-title-intro">Bienvenidos al Camino de la Reconquista</h2>',
    '      <p class="story-card__description">En este recorrido seguimos los pasos de los vecinos que en 1806 decidieron unirse para recuperar su tierra tras la ocupacion inglesa. A lo largo de estos hitos repasamos como se gesto la recuperacion de la capital del Virreinato, cuyo dominio britanico duro desde el 27 de junio hasta el 12 de agosto de ese mismo ano.</p>',
    '      <div class="story-card__actions">',
    '        <button class="chapter-button" type="button" disabled>Escuchar introduccion</button>',
    "      </div>",
    "    </div>",
    "  </div>",
    "</article>",
  ].join("");
}

function createProgressRail(activeIndex, total) {
  return [
    '<div class="story-step__rail" aria-hidden="true">',
    ...Array.from({ length: total }, (_, index) => {
      const classes = [
        "story-step__rail-dot",
        index === activeIndex ? "is-active" : "",
        index < activeIndex ? "is-past" : "",
      ].filter(Boolean).join(" ");

      return `<span class="${classes}">${index + 1}</span>`;
    }),
    "</div>",
  ].join("");
}

function getMicroStory(order) {
  const stories = {
    1: ["Derrota en el campo.", "Victoria moral para la resistencia."],
    2: ["Una chacra se volvio cuartel.", "La campana sostuvo la marcha."],
    3: ["La sudestada cambio el plan.", "Las Conchas abrio el camino."],
    4: ["La lluvia detuvo la columna.", "San Isidro le devolvio fuerzas."],
    5: ["El Fondo de la Legua unio pueblos.", "La marcha tomo rumbo final."],
    6: ["Beresford capitula.", "La memoria empieza a caminar."],
  };

  return stories[order] || [];
}

function getImpactStory(order) {
  const impacts = {
    1: "Perdriel fue el bautismo de fuego: hizo visible que el pueblo podia organizarse.",
    2: "La Chacra de los Marquez reunio alimentos, caballos, hombres y plan de marcha.",
    3: "La casa de Goyechea y el puerto de Las Conchas funcionaron como comando inicial.",
    4: "San Isidro sostuvo el relevo, el descanso y la moral antes del tramo decisivo.",
    5: "El paso por Vicente Lopez materializo la union de los pueblos del norte.",
    6: "La capitulacion del 12 de agosto volvio realidad la Reconquista de Buenos Aires.",
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

function createStoryMarkup(point, index, total) {
  const microStory = getMicroStory(point.order);
  const impactStory = getImpactStory(point.order);

  return [
    `<article class="story-step" id="step-${point.order}" data-index="${index}" aria-labelledby="story-title-${point.id}">`,
    `  <span class="story-step__marker" aria-hidden="true"><span>${point.order}</span></span>`,
    `  ${createProgressRail(index, total)}`,
    '  <div class="story-card">',
    '    <div class="story-card__copy">',
    '      <div class="story-card__topline">',
    `        <span class="story-card__ordinal">${padNumber(point.order)}</span>`,
    `        <span class="story-card__kicker">Punto ${point.order}</span>`,
    "      </div>",
    `      <h2 class="story-card__title" id="story-title-${point.id}">${escapeHtml(point.title)}</h2>`,
    '      <div class="story-card__block story-card__block--place">',
    '        <p class="story-card__label">Lugar</p>',
    `        <p class="story-card__place">${escapeHtml(point.place)}</p>`,
    "      </div>",
    '      <div class="story-card__block">',
    '        <p class="story-card__label">Qu\u00e9 ocurri\u00f3</p>',
    `        <p class="story-card__description">${escapeHtml(point.description)}</p>`,
    "      </div>",
    createMicroStoryMarkup(microStory),
    impactStory ? [
      '      <div class="story-card__block story-card__block--impact">',
      '        <p class="story-card__label">Por qu\u00e9 importa</p>',
      `        <p class="story-card__impact">${escapeHtml(impactStory)}</p>`,
      "      </div>",
    ].join("") : "",
    '      <div class="story-card__actions">',
    `        <button class="chapter-button" type="button" data-audio-point="${index}">Escuchar explicacion del punto ${point.order}</button>`,
    `        <a class="chapter-link" href="${escapeHtml(point.mapUrl)}" target="_blank" rel="noreferrer noopener">Como llegar</a>`,
    "      </div>",
    "    </div>",
    '    <figure class="story-card__figure">',
    `      <img src="${escapeHtml(point.imageSet.src880)}" srcset="${escapeHtml(point.imageSet.src560)} 560w, ${escapeHtml(point.imageSet.src880)} 880w, ${escapeHtml(point.imageSet.src)} 1200w" sizes="(max-width: 899px) 92vw, 44vw" alt="Ilustracion de ${escapeHtml(point.place)}" width="1200" height="800" loading="${index === 0 ? "eager" : "lazy"}"${index === 0 ? ' fetchpriority="high"' : ""} decoding="async">`,
    "    </figure>",
    "  </div>",
    "</article>",
  ].join("");
}

function createListMarkup(points, className) {
  return points
    .map((point, index) => {
      return [
        `<button class="${className}" type="button" data-jump-index="${index}">`,
        `  <span class="${className}__count">${padNumber(point.order)}</span>`,
        `  <span class="${className}__body">`,
        `    <strong class="${className}__title">${escapeHtml(point.title)}</strong>`,
        `    <span class="${className}__meta">${escapeHtml(point.place)} | ${escapeHtml(point.municipality)}</span>`,
        "  </span>",
        "</button>",
      ].join("");
    })
    .join("");
}

function setButtonBusy(button, label, disabled) {
  if (!button) {
    return;
  }

  button.textContent = label;
  button.disabled = disabled;
}

function getAudioLabel(audioState) {
  if (!audioState.available) {
    return "Audio pronto";
  }

  if (audioState.loading) {
    return "Cargando audio";
  }

  return audioState.isPlaying ? "Pausar audio" : "Escuchar punto";
}

function syncAudioButtons(audioState, pointButtons, mobileButton) {
  pointButtons.forEach((button) => {
    const pointIndex = Number(button.dataset.audioPoint);
    const isActiveTrack = pointIndex === Number(document.body.dataset.activeIndex || 0);
    const label =
      isActiveTrack && audioState.available
        ? getAudioLabel(audioState)
        : button.dataset.defaultLabel;

    button.disabled = button.dataset.available !== "true";
    button.textContent = label;
  });

  setButtonBusy(
    mobileButton,
    getAudioLabel(audioState),
    !audioState.available,
  );
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
    audioElement: document.getElementById("shared-audio"),
  };

  const data = await loadExperienceData();
  const totalPoints = data.points.length;

  dom.storySections.innerHTML = [
    createIntroMarkup(),
    data.points
      .map((point, index) => createStoryMarkup(point, index, totalPoints))
      .join(""),
  ].join("");
  dom.overviewList.innerHTML = createListMarkup(data.points, "overview-card");
  dom.timelineList.innerHTML = createListMarkup(data.points, "timeline-item");
  document.body.dataset.activeIndex = "intro";


  const chapterButtons = Array.from(
    dom.storySections.querySelectorAll("[data-audio-point]"),
  );
  chapterButtons.forEach((button) => {
    const point = data.points[Number(button.dataset.audioPoint)];
    button.dataset.defaultLabel = `Escuchar explicacion del punto ${point.order}`;
    button.dataset.available = String(point.audio.available);
  });

  const audioController = createAudioController({
    audioElement: dom.audioElement,
    onStateChange: syncAudioUi,
  });

  const mapController = await createMapController({
    containerId: "map",
    points: data.points,
    route: data.route,
    statusElement: dom.mapStatus,
  });

  const state = {
    activeIndex: -1,
    routeProgress: 0,
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
    syncAudioButtons(audioState, chapterButtons, null);
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
      step.classList.toggle("is-active", step.classList.contains("story-step--intro"));
    });

    dom.chapterCount.textContent = `0/${totalPoints}`;
    dom.chapterMunicipality.textContent = "Vista general";
    dom.activeTitle.textContent = "Bienvenidos al Camino de la Reconquista";
    dom.activePlace.textContent = "Una lectura guiada por los hitos de 1806";
    dom.progressStatus.textContent = "Vista general del recorrido";
    dom.mapsLink.href = "https://www.google.com/maps";
    dom.routeProgressFill.style.transform = "scaleX(0)";
    mapController.setActivePoint(0, { instant: true, progress: 0 });
    mapController.resetOverview();
    updateTimelineState(-1);
    audioController.setTrack(null);
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

    dom.chapterCount.textContent = getCounterLabel(index, totalPoints);
    dom.chapterMunicipality.textContent = point.municipality;
    dom.activeTitle.textContent = point.title;
    dom.activePlace.textContent = point.place;
    dom.progressStatus.textContent = getProgressStatus(index, totalPoints);
    dom.mapsLink.href = point.mapUrl;

    updateStoryState(index);
    updateTimelineState(index);
    updateRouteProgress(nextRouteProgress);
    mapController.setActivePoint(index, {
      instant: options.instantMap,
      progress: nextRouteProgress,
    });
    audioController.setTrack(point);
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

    step.scrollIntoView({ behavior, block: "center" });
  }

  function handleStepSelection(index) {
    closeTimeline();
    updatePrimaryState(index, { force: true });
    scrollToStep(index);
  }

  function handleSeek(inputElement) {
    audioController.seekByRatio(Number(inputElement.value) / 1000);
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
    const audioButton = event.target.closest("[data-audio-point]");

    if (audioButton) {
      const index = Number(audioButton.dataset.audioPoint);
      if (index !== state.activeIndex) {
        updatePrimaryState(index);
      }
      audioController.togglePlayback();
    }
  });

  [dom.overviewList, dom.timelineList].forEach((container) => {
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

  updatePrimaryState(0, { force: true, instantMap: true, routeProgress: 0 });
  updateIntroState();
  syncAudioUi(audioController.getState());
});
