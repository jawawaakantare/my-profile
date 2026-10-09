// 画面に入ったセクションを一度だけ起動する、短い端末風の表示シーケンス。
(() => {
  const sections = [...document.querySelectorAll("main > section")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const seen = new WeakSet();
  const timers = new Map();
  let observer;

  function finish(section) {
    clearTimeout(timers.get(section));
    timers.delete(section);
    section.classList.remove("is-entering");
    section.classList.add("is-revealed");
  }

  function configure() {
    observer?.disconnect();
    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      sections.forEach((section) => { seen.add(section); finish(section); });
      return;
    }
    observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting || seen.has(target)) return;
        seen.add(target);
        observer.unobserve(target);
        target.classList.add("is-entering");
        timers.set(target, setTimeout(() => finish(target), 600));
      });
    }, { threshold: 0, rootMargin: "0px 0px -48px 0px" });
    sections.filter((section) => !seen.has(section)).forEach((section) => observer.observe(section));
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
