function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function createInitialState() {
  return {
    pointId: null,
    pointTitle: "",
    title: "",
    src: "",
    available: false,
    note: "",
    currentTime: 0,
    duration: 0,
    loading: false,
    isPlaying: false,
    error: "",
  };
}

export function formatTime(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "00:00";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function createAudioController({ audioElement, onStateChange }) {
  const state = createInitialState();

  function emit() {
    onStateChange?.({ ...state });
  }

  function clearSource() {
    audioElement.pause();
    audioElement.removeAttribute("src");
    audioElement.load();
  }

  function setTrack(point) {
    const nextSource = point?.audio?.src || "";
    const nextAvailable = Boolean(point?.audio?.available && nextSource);
    const sameTrack =
      state.pointId === point?.id &&
      state.src === nextSource &&
      state.available === nextAvailable;

    if (sameTrack) {
      state.pointTitle = point.title;
      state.title = point.audio.title;
      state.note = point.audio.note;
      emit();
      return;
    }

    state.pointId = point?.id ?? null;
    state.pointTitle = point?.title || "";
    state.title = point?.audio?.title || "";
    state.src = nextSource;
    state.available = nextAvailable;
    state.note = point?.audio?.note || "";
    state.currentTime = 0;
    state.duration = point?.audio?.durationSeconds || 0;
    state.loading = nextAvailable;
    state.isPlaying = false;
    state.error = "";

    if (!nextAvailable) {
      clearSource();
      state.loading = false;
      emit();
      return;
    }

    audioElement.pause();
    audioElement.src = nextSource;
    audioElement.load();
    emit();
  }

  async function togglePlayback() {
    if (!state.available || !state.src) {
      return;
    }

    if (audioElement.paused) {
      try {
        await audioElement.play();
      } catch (error) {
        state.error = "No se pudo iniciar la reproduccion.";
        state.isPlaying = false;
        emit();
      }

      return;
    }

    audioElement.pause();
  }

  function seekByRatio(ratio) {
    if (!Number.isFinite(audioElement.duration) || audioElement.duration <= 0) {
      return;
    }

    audioElement.currentTime =
      clamp(ratio, 0, 1) * Number(audioElement.duration);
  }

  audioElement.addEventListener("loadedmetadata", () => {
    state.duration = Number(audioElement.duration) || state.duration;
    state.loading = false;
    state.error = "";
    emit();
  });

  audioElement.addEventListener("canplay", () => {
    state.loading = false;
    emit();
  });

  audioElement.addEventListener("play", () => {
    state.isPlaying = true;
    state.error = "";
    emit();
  });

  audioElement.addEventListener("pause", () => {
    state.isPlaying = false;
    emit();
  });

  audioElement.addEventListener("timeupdate", () => {
    state.currentTime = Number(audioElement.currentTime) || 0;
    emit();
  });

  audioElement.addEventListener("ended", () => {
    state.isPlaying = false;
    state.currentTime = Number(audioElement.duration) || state.currentTime;
    emit();
  });

  audioElement.addEventListener("waiting", () => {
    state.loading = true;
    emit();
  });

  audioElement.addEventListener("error", () => {
    state.available = false;
    state.loading = false;
    state.isPlaying = false;
    state.error = "El audio aun no esta disponible en el repositorio.";
    emit();
  });

  return {
    getState() {
      return { ...state };
    },
    setTrack,
    togglePlayback,
    seekByRatio,
  };
}
