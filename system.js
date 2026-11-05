// 初回進入の起動演出。本文・ボタン・セクション自体の表示と位置は変更しません。
(() => {
  const sections = [...document.querySelectorAll("#profile, #network, #photo-gallery, #work-archive")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const seen = new WeakSet();
  const observers = new Map();
  const timers = new Map();

  sections.forEach((section) => {
    const layer = document.createElement("span");
    layer.className = "panel-boot";
    layer.setAttribute("aria-hidden", "true");
    ["line", "ready", "facet"].forEach((part) => {
      const decoration = document.createElement("i");
      decoration.className = "panel-boot-" + part;
      layer.append(decoration);
    });
    section.append(layer);
    layer.lastElementChild.addEventListener("animationend", (event) => {
      if (event.animationName === "panel-boot-facet") finish(section);
    });
  });

  function finish(section) {
    clearTimeout(timers.get(section));
    timers.delete(section);
    section.classList.remove("is-booting");
    section.classList.add("is-revealed");
  }

  function configure() {
    observers.forEach((observer) => observer.disconnect());
    observers.clear();
    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      sections.forEach((section) => { seen.add(section); finish(section); });
      return;
    }
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    sections.filter((section) => !seen.has(section)).forEach((section) => {
      // 小さいパネルは20%、大きいパネルは最大96pxほど見えたら起動します。
      // 寸法は設定時に一度だけ読み、スクロールイベントで計算しません。
      const height = Math.max(1, section.getBoundingClientRect().height);
      const threshold = Math.min(0.2, Math.min(96, viewportHeight * 0.14) / height);
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting, intersectionRatio }) => {
          if (!isIntersecting || intersectionRatio + 0.0001 < threshold || seen.has(target)) return;
          seen.add(target);
          observer.disconnect();
          observers.delete(target);
          target.classList.add("is-booting");
          // CSSは500msで終了。背景タブなどでanimationendが来ない場合の後始末です。
          timers.set(target, setTimeout(() => finish(target), 550));
        });
      }, { threshold: [threshold], rootMargin: "0px 0px -24px 0px" });
      observers.set(section, observer);
      observer.observe(section);
    });
  }

  reducedMotion.addEventListener("change", configure);
  configure();
})();

// 操作の反応だけを共通化し、移動・開閉・テーマ・再生処理には介入しません。
(() => {
  const timers = new WeakMap();
  const controls = ".social-link, .theme-toggle, .gallery-playback, .gallery-control, .bio-toggle, .gallery-photo, .wordmark";

  function feedback(control) {
    clearTimeout(timers.get(control));
    control.classList.remove("is-pressed");
    void control.offsetWidth;
    control.classList.add("is-pressed");
    timers.set(control, setTimeout(() => control.classList.remove("is-pressed"), 450));
  }

  // 写真ボタンは画像読み込み後に生成されるため、イベントを委譲します。
  document.addEventListener("pointerdown", (event) => {
    const control = event.target.closest(controls);
    if (control && !control.disabled && event.isPrimary && event.button === 0) feedback(control);
  });
  document.addEventListener("keydown", (event) => {
    const control = event.target.closest(controls);
    if (!control || control.disabled || event.repeat) return;
    if (event.key === "Enter" || (event.key === " " && control.matches("button"))) feedback(control);
  });
})();
