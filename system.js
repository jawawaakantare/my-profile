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
