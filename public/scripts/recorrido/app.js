import { loadExperienceData, padNumber } from "./data.js";
import { createAudioController, formatTime } from "./audio.js";
import { createMapController, createMapSnapshotMarkup } from "./map.js";

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

function getSnapshotProgress(index, total) {
  if (index < 0) {
    return 1;
  }

  return getRouteProgressForStep(index, total, 0.52);
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

function createIntroMarkup(total, snapshotMarkup) {
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
    `  <div class="story-mobile-map">${snapshotMarkup}</div>`,
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

function createStoryMarkup(point, index, total, snapshotMarkup) {
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
    `      <p class="story-card__place">${escapeHtml(point.place)}</p>`,
    `      <p class="story-card__description">${escapeHtml(point.description)}</p>`,
    '      <div class="story-card__actions">',
    `        <button class="chapter-button" type="button" data-audio-point="${index}">Escuchar explicacion del punto ${point.order}</button>`,
    `        <a class="chapter-link" href="${escapeHtml(point.mapUrl)}" target="_blank" rel="noreferrer noopener">Como llegar</a>`,
    "      </div>",
    "    </div>",
    '    <figure class="story-card__figure">',
    `      <img src="${escapeHtml(point.image)}" alt="Ilustracion de ${escapeHtml(point.place)}" width="1536" height="1024" loading="lazy" decoding="async">`,
    "    </figure>",
    "  </div>",
    `  <div class="story-mobile-map">${snapshotMarkup}</div>`,
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
    mobileMapsLink: document.getElementById("mobile-maps-link"),
    audioTitle: document.getElementById("audio-title"),
    audioPointLabel: document.getElementById("audio-point-label"),
    audioNote: document.getElementById("audio-note"),
    audioToggle: document.getElementById("audio-toggle"),
    audioSeek: document.getElementById("audio-seek"),
    audioCurrent: document.getElementById("audio-current"),
    audioDuration: document.getElementById("audio-duration"),
    mobileCount: document.getElementById("mobile-count"),
    mobileMunicipality: document.getElementById("mobile-municipality"),
    mobileTitle: document.getElementById("mobile-title"),
    mobilePlace: document.getElementById("mobile-place"),
    mobileDescription: document.getElementById("mobile-description"),
    mobileImage: document.getElementById("mobile-image"),
    mobileAudioToggle: document.getElementById("mobile-audio-toggle"),
    mobileAudioNote: document.getElementById("mobile-audio-note"),
    mobileAudioSeek: document.getElementById("mobile-audio-seek"),
    mobileAudioCurrent: document.getElementById("mobile-audio-current"),
    mobileAudioDuration: document.getElementById("mobile-audio-duration"),
    mobilePrev: document.getElementById("mobile-prev"),
    mobileNext: document.getElementById("mobile-next"),
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
  const introSnapshot = createMapSnapshotMarkup({
    points: data.points,
    route: data.route,
    activeIndex: 0,
    progress: 1,
    idPrefix: "snapshot-intro",
  });

  dom.storySections.innerHTML = [
    createIntroMarkup(totalPoints, introSnapshot),
    data.points.map((point, index) => {
      const snapshot = createMapSnapshotMarkup({
        points: data.points,
        route: data.route,
        activeIndex: index,
        progress: getSnapshotProgress(index, totalPoints),
        idPrefix: `snapshot-${index}`,
      });

      return createStoryMarkup(point, index, totalPoints, snapshot);
    }).join(""),
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
    const label = getAudioLabel(audioState);
    const durationLabel = audioState.duration
      ? formatTime(audioState.duration)
      : "--:--";
    const progressRatio =
      audioState.duration > 0
        ? String(Math.round((audioState.currentTime / audioState.duration) * 1000))
        : "0";

    dom.audioTitle.textContent = audioState.title || "Audio del punto";
    dom.audioPointLabel.textContent =
      audioState.pointTitle || "Selecciona un punto del recorrido";
    dom.audioNote.textContent =
      audioState.error || audioState.note || "Recurso asociado al punto activo.";
    dom.audioCurrent.textContent = formatTime(audioState.currentTime);
    dom.audioDuration.textContent = durationLabel;
    dom.audioSeek.value = progressRatio;
    dom.audioSeek.disabled = !audioState.available || audioState.duration <= 0;
    setButtonBusy(dom.audioToggle, label, !audioState.available);

    dom.mobileAudioNote.textContent =
      audioState.error || audioState.note || "Recurso asociado al punto activo.";
    dom.mobileAudioCurrent.textContent = formatTime(audioState.currentTime);
    dom.mobileAudioDuration.textContent = durationLabel;
    dom.mobileAudioSeek.value = progressRatio;
    dom.mobileAudioSeek.disabled =
      !audioState.available || audioState.duration <= 0;

    syncAudioButtons(audioState, chapterButtons, dom.mobileAudioToggle);
  }

  function updateTimelineState(index) {
    document
      .querySelectorAll("[data-jump-index]")
      .forEach((button) => {
        button.classList.toggle(
          "is-active",
          Number(button.dataset.jumpIndex) === index,
        );
      });
  }

  function updateStoryState(index) {
    document.body.dataset.activeIndex = String(index);

    dom.storySections
      .querySelector(".story-step--intro")
      ?.classList.remove("is-active");

    dom.storySections.querySelectorAll(".story-step").forEach((step) => {
      step.classList.toggle(
        "is-active",
        Number(step.dataset.index) === index,
      );
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

    dom.mobileCount.textContent = `0/${totalPoints}`;
    dom.mobileMunicipality.textContent = "Vista general";
    dom.mobileTitle.textContent = "Bienvenidos al Camino de la Reconquista";
    dom.mobilePlace.textContent = "Una lectura guiada por los hitos de 1806";
    dom.mobileDescription.textContent =
      "Avanza para recorrer los seis puntos principales de la Reconquista.";
    audioController.setTrack(null);
  }

  function updateMobileState(point, index) {
    dom.mobileCount.textContent = getCounterLabel(index, totalPoints);
    dom.mobileMunicipality.textContent = point.municipality;
    dom.mobileTitle.textContent = point.title;
    dom.mobilePlace.textContent = point.place;
    dom.mobileDescription.textContent = point.description;
    dom.mobileImage.src = point.image;
    dom.mobileImage.alt = `Ilustracion de ${point.place}`;
    dom.mobileMapsLink.href = point.mapUrl;
    dom.mobilePrev.disabled = index === 0;
    dom.mobileNext.disabled = index === totalPoints - 1;
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
    updateMobileState(point, index);
    updateRouteProgress(nextRouteProgress);
    mapController.setActivePoint(index, {
      instant: options.instantMap,
      progress: nextRouteProgress,
    });
    audioController.setTrack(point);
  }

  function openTimeline() {
    dom.timelinePanel.hidden = false;
    dom.timelineBackdrop.hidden = false;
    document.body.classList.add("timeline-open");
    dom.timelineOpenButtons.forEach((button) => {
      button.setAttribute("aria-expanded", "true");
    });
  }

  function closeTimeline() {
    dom.timelinePanel.hidden = true;
    dom.timelineBackdrop.hidden = true;
    document.body.classList.remove("timeline-open");
    dom.timelineOpenButtons.forEach((button) => {
      button.setAttribute("aria-expanded", "false");
    });
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

  dom.audioToggle.addEventListener("click", () => {
    audioController.togglePlayback();
  });
  dom.mobileAudioToggle.addEventListener("click", () => {
    audioController.togglePlayback();
  });
  dom.audioSeek.addEventListener("input", () => handleSeek(dom.audioSeek));
  dom.mobileAudioSeek.addEventListener("input", () =>
    handleSeek(dom.mobileAudioSeek),
  );

  dom.mobilePrev.addEventListener("click", () => {
    handleStepSelection(Math.max(0, state.activeIndex - 1));
  });
  dom.mobileNext.addEventListener("click", () => {
    handleStepSelection(Math.min(totalPoints - 1, state.activeIndex + 1));
  });

  dom.timelineOpenButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (dom.timelinePanel.hidden) {
        openTimeline();
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
    }
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
