import { loadExperienceData, padNumber } from "./data.js";
import { createAudioController, formatTime } from "./audio.js";
import { createMapController } from "./map.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function debounce(callback, wait = 160) {
  let timeoutId = 0;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), wait);
  };
}

function getProgressLabel(index, total) {
  return `${padNumber(index + 1)}/${padNumber(total)}`;
}

function getProgressStatus(index, total) {
  if (index === 0) {
    return "Inicio del recorrido";
  }

  if (index === total - 1) {
    return "Cierre del recorrido";
  }

  return `Tramo ${padNumber(index + 1)} de ${padNumber(total)}`;
}

function createIntroMarkup(total) {
  return [
    '<article class="story-step story-step--intro is-active" data-step-label="0" aria-labelledby="story-title-intro">',
    '  <div class="story-step__anchor" aria-hidden="true">',
    `    <span class="story-step__anchor-count">00/${padNumber(total)}</span>`,
    '    <span class="story-step__anchor-muni">Inicio</span>',
    "  </div>",
    '  <div class="story-card story-card--intro">',
    '    <div class="story-card__topline">',
    '      <span class="story-card__count">Introduccion</span>',
    "    </div>",
    '    <h2 class="story-card__title" id="story-title-intro">Bienvenidos al Camino de la Reconquista</h2>',
    '    <div class="story-card__divider"></div>',
    '    <p class="story-card__description">En este recorrido seguimos los pasos de los vecinos que en 1806 decidieron unirse para recuperar su tierra tras la ocupacion inglesa. A lo largo de estos hitos repasamos como se gesto la recuperacion de la capital del Virreinato, cuyo dominio britanico duro desde el 27 de junio hasta el 12 de agosto de ese mismo ano.</p>',
    '    <div class="story-card__actions">',
    '      <button class="chapter-button" type="button" disabled>Escuchar introduccion</button>',
    "    </div>",
    "  </div>",
    "</article>",
  ].join("");
}

function createStoryMarkup(point, index, total) {
  return [
    `<article class="story-step" id="step-${point.order}" data-index="${index}" data-step-label="${padNumber(point.order)}" aria-labelledby="story-title-${point.id}">`,
    '  <div class="story-step__anchor" aria-hidden="true">',
    `    <span class="story-step__anchor-count">${getProgressLabel(index, total)}</span>`,
    `    <span class="story-step__anchor-muni">${escapeHtml(point.municipality)}</span>`,
    "  </div>",
    '  <div class="story-card">',
    '    <div class="story-card__topline">',
    `      <span class="story-card__count">${getProgressLabel(index, total)}</span>`,
    `      <span class="story-card__municipality">${escapeHtml(point.municipality)}</span>`,
    "    </div>",
    `    <h2 class="story-card__title" id="story-title-${point.id}">${escapeHtml(point.title)}</h2>`,
    '    <div class="story-card__divider"></div>',
    `    <p class="story-card__place">${escapeHtml(point.place)}</p>`,
    `    <p class="story-card__description">${escapeHtml(point.description)}</p>`,
    '    <figure class="story-card__figure">',
    `      <img src="${escapeHtml(point.image)}" data-fallback-src="${escapeHtml(point.fallbackImage)}" alt="Ilustracion de ${escapeHtml(point.place)}" loading="lazy" decoding="async">`,
    "    </figure>",
    '    <div class="story-card__actions">',
    `      <button class="chapter-button" type="button" data-audio-point="${index}">Escuchar explicacion del punto ${point.order}</button>`,
    `      <a class="chapter-link" href="${escapeHtml(point.mapUrl)}" target="_blank" rel="noreferrer noopener">Abrir en mapas</a>`,
    "    </div>",
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
        "  <span class=\"timeline-item__body\">",
        `    <strong class="${className}__title">${escapeHtml(point.title)}</strong>`,
        `    <span class="${className}__meta">${escapeHtml(point.place)} · ${escapeHtml(point.municipality)}</span>`,
        "  </span>",
        "</button>",
      ].join("");
    })
    .join("");
}

function applyImageFallbacks(root) {
  root.querySelectorAll("img[data-fallback-src]").forEach((image) => {
    image.addEventListener("error", () => {
      if (!image.dataset.fallbackSrc) {
        return;
      }

      if (image.getAttribute("src") === image.dataset.fallbackSrc) {
        return;
      }

      image.src = image.dataset.fallbackSrc;
    });
  });
}

function setButtonBusy(button, label, disabled) {
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
      document.getElementById("hero-timeline-button"),
    ].filter(Boolean),
    timelineClose: document.getElementById("timeline-close"),
    mapStatus: document.getElementById("map-status"),
    mapReset: document.getElementById("map-reset"),
    audioElement: document.getElementById("shared-audio"),
  };

  const data = await loadExperienceData();
  const totalPoints = data.points.length;

  dom.storySections.innerHTML = [
    createIntroMarkup(totalPoints),
    data.points.map((point, index) => createStoryMarkup(point, index, totalPoints)).join(""),
  ].join("");
  dom.overviewList.innerHTML = createListMarkup(data.points, "overview-card");
  dom.timelineList.innerHTML = createListMarkup(data.points, "timeline-item");
  document.body.dataset.activeIndex = "0";

  applyImageFallbacks(document);

  const chapterButtons = Array.from(
    dom.storySections.querySelectorAll("[data-audio-point]"),
  );
  chapterButtons.forEach((button) => {
    const point = data.points[Number(button.dataset.audioPoint)];
    button.dataset.defaultLabel = `Escuchar explicacion del punto ${point.order}`;
    button.dataset.available = String(point.audio.available);
  });

  if (!window.gsap || !window.ScrollTrigger || !window.maplibregl) {
    dom.mapStatus.textContent =
      "Faltan dependencias del navegador para cargar el mapa vivo. El relato sigue disponible.";
    dom.mapStatus.dataset.state = "error";
    return;
  }

  const audioController = createAudioController({
    audioElement: dom.audioElement,
    onStateChange: syncAudioUi,
  });

  const mapController = await createMapController({
    containerId: "map",
    points: data.points,
    route: data.route,
    pointsFeatureCollection: data.pointsFeatureCollection,
    statusElement: dom.mapStatus,
  });

  window.gsap.registerPlugin(window.ScrollTrigger);

  const state = {
    activeIndex: 0,
    routeProgress: 0,
  };

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
    document.body.dataset.activeIndex = "intro";

    dom.storySections.querySelectorAll(".story-step").forEach((step) => {
      step.classList.toggle("is-active", step.classList.contains("story-step--intro"));
    });

    dom.chapterCount.textContent = `00/${padNumber(totalPoints)}`;
    dom.chapterMunicipality.textContent = "Inicio";
    dom.activeTitle.textContent = "Bienvenidos al Camino de la Reconquista";
    dom.activePlace.textContent = "Una lectura guiada por los hitos de 1806";
    dom.progressStatus.textContent = "Inicio del recorrido";
    dom.routeProgressFill.style.transform = "scaleX(0)";

    dom.mobileCount.textContent = `00/${padNumber(totalPoints)}`;
    dom.mobileMunicipality.textContent = "Inicio";
    dom.mobileTitle.textContent = "Bienvenidos al Camino de la Reconquista";
    dom.mobilePlace.textContent = "Una lectura guiada por los hitos de 1806";
    dom.mobileDescription.textContent =
      "Avanza para recorrer los seis puntos principales de la Reconquista.";

    mapController.resetOverview();
  }

  function updateMobileState(point, index) {
    dom.mobileCount.textContent = getProgressLabel(index, totalPoints);
    dom.mobileMunicipality.textContent = point.municipality;
    dom.mobileTitle.textContent = point.title;
    dom.mobilePlace.textContent = point.place;
    dom.mobileDescription.textContent = point.description;
    dom.mobileImage.src = point.image;
    dom.mobileImage.dataset.fallbackSrc = point.fallbackImage;
    dom.mobileImage.alt = `Ilustracion de ${point.place}`;
    dom.mobileMapsLink.href = point.mapUrl;
    dom.mobilePrev.disabled = index === 0;
    dom.mobileNext.disabled = index === totalPoints - 1;
  }

  function updatePrimaryState(index, options = {}) {
    if (state.activeIndex === index && !options.force) {
      return;
    }

    state.activeIndex = index;
    const point = getActivePoint();

    dom.chapterCount.textContent = getProgressLabel(index, totalPoints);
    dom.chapterMunicipality.textContent = point.municipality;
    dom.activeTitle.textContent = point.title;
    dom.activePlace.textContent = point.place;
    dom.progressStatus.textContent = getProgressStatus(index, totalPoints);
    dom.mapsLink.href = point.mapUrl;

    updateStoryState(index);
    updateTimelineState(index);
    updateMobileState(point, index);
    mapController.setActivePoint(index, { instant: options.instantMap });
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

  function scrollToStep(index) {
    const step = document.querySelector(`.story-step[data-index="${index}"]`);
    if (!step) {
      return;
    }

    step.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleStepSelection(index) {
    closeTimeline();
    updatePrimaryState(index);
    scrollToStep(index);
  }

  function handleSeek(inputElement) {
    audioController.seekByRatio(Number(inputElement.value) / 1000);
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

  const introStep = document.querySelector(".story-step--intro");
  if (introStep) {
    window.ScrollTrigger.create({
      trigger: introStep,
      start: "top 52%",
      end: "bottom 52%",
      onEnter: updateIntroState,
      onEnterBack: updateIntroState,
    });
  }

  const storySteps = Array.from(document.querySelectorAll(".story-step[data-index]"));
  storySteps.forEach((step) => {
    const index = Number(step.dataset.index);

    window.ScrollTrigger.create({
      trigger: step,
      start: "top 52%",
      end: "bottom 52%",
      onEnter: () => updatePrimaryState(index),
      onEnterBack: () => updatePrimaryState(index),
    });
  });

  window.ScrollTrigger.create({
    trigger: "#experience-shell",
    start: "top top",
    end: "bottom bottom",
    scrub: 0.4,
    onUpdate: (scrollTrigger) => updateRouteProgress(scrollTrigger.progress),
  });

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (!prefersReducedMotion) {
    const hero = document.querySelector(".hero");
    const shouldAnimateHero =
      hero && window.getComputedStyle(hero).display !== "none";

    if (shouldAnimateHero) {
      window.gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(".hero-logo__mark", { scale: 0.88, opacity: 0, duration: 0.9 })
        .from(".hero-logo__title", { y: 22, opacity: 0, duration: 0.75 }, "-=0.45")
        .from(".hero-scroll", { y: -8, opacity: 0, duration: 0.55 }, "-=0.2");

      window.gsap.to(".hero-logo", {
        yPercent: -8,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: 0.35,
        },
      });
    }

    window.gsap.utils.toArray(".overview-card").forEach((card, index) => {
      window.gsap.from(card, {
        y: 18,
        opacity: 0,
        duration: 0.45,
        delay: index * 0.03,
        scrollTrigger: {
          trigger: card,
          start: "top 86%",
        },
      });
    });

    window.gsap.from(".closing-card > *", {
      y: 24,
      opacity: 0,
      duration: 0.55,
      stagger: 0.08,
      scrollTrigger: {
        trigger: ".closing-card",
        start: "top 78%",
      },
    });
  }

  const handleResize = debounce(() => {
    mapController.resize();
    window.ScrollTrigger.refresh();
  }, 120);

  window.addEventListener("resize", handleResize);

  updateRouteProgress(0);
  updatePrimaryState(0, { force: true, instantMap: true });
  updateIntroState();
  syncAudioUi(audioController.getState());
});
