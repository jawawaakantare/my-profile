// 写真数の表示だけ更新します。カルーセルの移動や操作には触れません。
const photoStreamCount = document.getElementById("photo-stream-count");
if (photoStreamCount && typeof tomogashimaPhotos !== "undefined") {
  photoStreamCount.textContent = `${tomogashimaPhotos.length} IMAGES`;
}

// 既存の浮遊アニメーションを包み、スクロールの微小な奥行きだけ合成します。
(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compact = window.matchMedia("(max-width: 559px)");
  const layers = [
    [".ambient-diamonds--panels", 16],
    [".ambient-diamonds--wire", 6],
    [".ambient-grid--far", 3],
  ].flatMap(([selector, distance]) => {
    const layer = document.querySelector(selector);
    if (!layer) return [];
    const wrapper = document.createElement("div");
    wrapper.className = "ambient-depth";
    layer.before(wrapper);
    wrapper.append(layer);
    return [{ wrapper, distance }];
  });
  let frame = null;
  let listening = false;

  function update() {
    frame = null;
    const progress = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    layers.forEach(({ wrapper, distance }) => {
      wrapper.style.setProperty("--depth-offset", `${(-Math.min(1, Math.max(0, progress)) * distance).toFixed(2)}px`);
    });
  }
  function queueUpdate() {
    if (frame === null) frame = requestAnimationFrame(update);
  }
  function configure() {
    const enabled = !reducedMotion.matches && !compact.matches;
    if (enabled && !listening) {
      window.addEventListener("scroll", queueUpdate, { passive: true });
      window.addEventListener("resize", queueUpdate, { passive: true });
      listening = true;
    } else if (!enabled && listening) {
      window.removeEventListener("scroll", queueUpdate);
      window.removeEventListener("resize", queueUpdate);
      listening = false;
    }
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    if (enabled) queueUpdate();
    else layers.forEach(({ wrapper }) => wrapper.style.removeProperty("--depth-offset"));
  }
  reducedMotion.addEventListener("change", configure);
  compact.addEventListener("change", configure);
  configure();
})();
