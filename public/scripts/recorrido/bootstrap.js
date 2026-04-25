if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    if (regs.length) {
      console.log("[camino] unregistering", regs.length, "stale service workers");
      regs.forEach((r) => r.unregister());
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const s = document.getElementById("protagonistas");
  const rect = s ? s.getBoundingClientRect() : null;
  console.log("[camino] protagonistas in DOM:", !!s, rect);
  if (!s) {
    console.warn("[camino] protagonistas section missing — likely an extension is stripping it");
  }
});
