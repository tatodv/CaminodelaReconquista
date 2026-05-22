function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function createInitialState() {
  return {
    trackId: null,
    trackType: "",
    pointId: null,
    title: "",
    available: false,
    segments: [],
    segmentIndex: 0,
    segmentRole: "",
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
  let pendingSeek = 0;
  let shouldPlayAfterLoad = false;

  function emit() {
    onStateChange?.({ ...state, segments: [...state.segments] });
  }

  function getSegmentStart(index) {
    return state.segments
      .slice(0, index)
      .reduce((total, segment) => total + (segment.durationSeconds || 0), 0);
  }

  function getCurrentSegment() {
    return state.segments[state.segmentIndex];
  }

  function syncCurrentTime() {
    state.currentTime =
      getSegmentStart(state.segmentIndex) + (Number(audioElement.currentTime) || 0);
    state.canSkipIntro = state.segments.some((segment) => segment.role === "intro")
      && state.segmentRole === "intro";
  }

  function clearSource() {
    audioElement.pause();
    audioElement.removeAttribute("src");
    audioElement.load();
  }

  function loadSegment(index, offset = 0, autoplay = false) {
    const segment = state.segments[index];

    if (!segment) {
      state.status = "ended";
      state.loading = false;
      state.isPlaying = false;
      syncCurrentTime();
      emit();
      return;
    }

    state.segmentIndex = index;
    state.segmentRole = segment.role;
    state.loading = true;
    state.status = "loading";
    state.error = "";
    pendingSeek = Math.max(0, offset);
    shouldPlayAfterLoad = autoplay;

    audioElement.pause();
    audioElement.src = segment.src;
    audioElement.playbackRate = state.playbackRate;
    audioElement.load();
    syncCurrentTime();
    emit();
  }

  function setTrack(track) {
    const nextSegments = Array.isArray(track?.segments) ? track.segments : [];
    const nextAvailable = Boolean(track?.available && nextSegments.length);
    const sameTrack = state.trackId === track?.id && state.available === nextAvailable;

    if (sameTrack) {
      emit();
      return;
    }

    state.trackId = track?.id ?? null;
    state.trackType = track?.type || "";
    state.pointId = track?.pointId ?? null;
    state.title = track?.title || "";
    state.available = nextAvailable;
    state.segments = nextAvailable ? nextSegments : [];
    state.segmentIndex = 0;
    state.segmentRole = "";
    state.currentTime = 0;
    state.duration = Number(track?.durationSeconds ?? 0) || 0;
    state.status = nextAvailable ? "paused" : "idle";
    state.loading = false;
    state.isPlaying = false;
    state.error = "";
    state.canSkipIntro = nextSegments.some((segment) => segment.role === "intro");

    if (!nextAvailable) {
      clearSource();
      emit();
      return;
    }

    loadSegment(0, 0, false);
  }

  async function play() {
    if (!state.available || !getCurrentSegment()) {
      return;
    }

    try {
      audioElement.playbackRate = state.playbackRate;
      await audioElement.play();
    } catch (error) {
      state.error = "No se pudo cargar el audio";
      state.status = "error";
      state.isPlaying = false;
      state.loading = false;
      emit();
    }
  }

  function pause() {
    audioElement.pause();
  }

  async function togglePlayback() {
    if (state.status === "ended") {
      loadSegment(0, 0, true);
      return;
    }

    if (audioElement.paused) {
      await play();
      return;
    }

    pause();
  }

  function seekTo(totalSeconds, autoplay = state.isPlaying) {
    if (!state.available || !state.segments.length) {
      return;
    }

    const nextTime = clamp(totalSeconds, 0, state.duration);
    let elapsed = 0;

    for (let index = 0; index < state.segments.length; index += 1) {
      const segment = state.segments[index];
      const segmentDuration = segment.durationSeconds || 0;

      if (nextTime <= elapsed + segmentDuration || index === state.segments.length - 1) {
        loadSegment(index, nextTime - elapsed, autoplay);
        return;
      }

      elapsed += segmentDuration;
    }
  }

  function seekByRatio(ratio) {
    seekTo(clamp(ratio, 0, 1) * state.duration);
  }

  function seekBySeconds(delta) {
    seekTo(state.currentTime + delta);
  }

  function skipIntro() {
    const mainIndex = state.segments.findIndex((segment) => segment.role === "main");

    if (mainIndex >= 0) {
      loadSegment(mainIndex, 0, true);
    }
  }

  function setPlaybackRate(rate) {
    state.playbackRate = Number(rate) || 1;
    audioElement.playbackRate = state.playbackRate;
    emit();
  }

  audioElement.addEventListener("loadedmetadata", () => {
    if (pendingSeek > 0) {
      audioElement.currentTime = Math.min(
        pendingSeek,
        Number(audioElement.duration) || pendingSeek,
      );
    }

    pendingSeek = 0;
    state.loading = false;
    state.status = audioElement.paused ? "paused" : "playing";
    syncCurrentTime();
    emit();

    if (shouldPlayAfterLoad) {
      shouldPlayAfterLoad = false;
      play();
    }
  });

  audioElement.addEventListener("canplay", () => {
    state.loading = false;
    if (state.status === "loading") {
      state.status = audioElement.paused ? "paused" : "playing";
    }
    syncCurrentTime();
    emit();
  });

  audioElement.addEventListener("play", () => {
    state.isPlaying = true;
    state.status = "playing";
    state.error = "";
    syncCurrentTime();
    emit();
  });

  audioElement.addEventListener("pause", () => {
    state.isPlaying = false;
    if (state.status !== "ended" && state.status !== "error") {
      state.status = "paused";
    }
    syncCurrentTime();
    emit();
  });

  audioElement.addEventListener("timeupdate", () => {
    syncCurrentTime();
    emit();
  });

  audioElement.addEventListener("ratechange", () => {
    state.playbackRate = Number(audioElement.playbackRate) || state.playbackRate;
    emit();
  });

  audioElement.addEventListener("ended", () => {
    const nextIndex = state.segmentIndex + 1;

    if (nextIndex < state.segments.length) {
      loadSegment(nextIndex, 0, true);
      return;
    }

    state.isPlaying = false;
    state.loading = false;
    state.status = "ended";
    state.currentTime = state.duration;
    state.canSkipIntro = false;
    emit();
  });

  audioElement.addEventListener("waiting", () => {
    state.loading = true;
    if (state.status !== "ended") {
      state.status = "loading";
    }
    emit();
  });

  audioElement.addEventListener("error", () => {
    state.loading = false;
    state.isPlaying = false;
    state.status = "error";
    state.error = "No se pudo cargar el audio";
    emit();
  });

  return {
    getState() {
      return { ...state, segments: [...state.segments] };
    },
    setTrack,
    pause,
    togglePlayback,
    seekByRatio,
    seekBySeconds,
    skipIntro,
    setPlaybackRate,
  };
}
