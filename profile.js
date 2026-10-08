// 本文は保存せず、ページを開くたびに最初の2行だけ表示します。
(() => {
  const button = document.getElementById("bio-toggle");
  const content = document.getElementById("bio-more");
  if (!button || !content) return;
  const label = button.querySelector(".bio-toggle-label");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let expanded = false;
  let animation = null;

  content.hidden = true;
  content.inert = true;
  button.hidden = false;

  function settle() {
    if (animation) animation.cancel();
    animation = null;
    content.hidden = !expanded;
  }

  button.addEventListener("click", () => {
    const height = content.getBoundingClientRect().height;
    const opacity = content.hidden ? 0 : Number(getComputedStyle(content).opacity);
    if (animation) animation.cancel();
    expanded = !expanded;
    button.setAttribute("aria-expanded", String(expanded));
    label.textContent = expanded ? "閉じる" : "その他";
    content.inert = !expanded;
    content.hidden = false;

    if (reducedMotion.matches || typeof content.animate !== "function") {
      settle();
      return;
    }
    // 展開時だけ高さを動かし、完了後はautoに戻して折り返し・リサイズに追従。
    animation = content.animate([
      { height: `${height}px`, opacity },
      { height: `${expanded ? content.scrollHeight : 0}px`, opacity: expanded ? 1 : 0 },
    ], { duration: 280, easing: "cubic-bezier(.2,.7,.2,1)", fill: "both" });
    animation.onfinish = settle;
  });

  reducedMotion.addEventListener("change", settle);
  window.addEventListener("resize", settle);
})();
