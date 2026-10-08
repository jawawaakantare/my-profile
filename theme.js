// CSSを読み込む前にテーマを決め、保存済みテーマと逆の配色が一瞬出るのを防ぎます。
(() => {
  const storageKey = "jawawa-theme";
  const root = document.documentElement;
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let manualTheme = null;
  let button;
  let transition;

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === "light" || saved === "dark") manualTheme = saved;
  } catch {
    // 保存が禁止されている環境でも、表示とこのページ内の切り替えは使えます。
  }

  function selectedTheme() {
    return manualTheme || (systemTheme.matches ? "dark" : "light");
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.content = theme === "dark" ? "#071426" : "#f2faff";
    });
    if (button) {
      const label = `${theme === "dark" ? "ライト" : "ダーク"}モードに切り替える`;
      button.setAttribute("aria-label", label);
      button.setAttribute("aria-pressed", String(theme === "dark"));
      button.title = label;
    }
  }

  function changeTheme(animate = true) {
    const theme = selectedTheme();
    transition?.skipTransition();
    if (animate && !reducedMotion.matches && document.startViewTransition) {
      transition = document.startViewTransition(() => applyTheme(theme));
      // 連続操作で前のクロスフェードを中断しても、テーマの選択は反映されます。
      transition.ready.catch(() => {});
    } else {
      applyTheme(theme);
    }
  }

  applyTheme(selectedTheme());
  systemTheme.addEventListener("change", () => {
    if (manualTheme === null) changeTheme();
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey && event.key !== null) return;
    manualTheme = event.newValue === "light" || event.newValue === "dark" ? event.newValue : null;
    changeTheme();
  });
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) transition?.skipTransition();
  });

  document.addEventListener("DOMContentLoaded", () => {
    button = document.getElementById("theme-toggle");
    if (!button) return;
    applyTheme(selectedTheme());
    button.hidden = false;
    button.addEventListener("click", () => {
      manualTheme = selectedTheme() === "dark" ? "light" : "dark";
      try { localStorage.setItem(storageKey, manualTheme); } catch {}
      changeTheme();
    });
  }, { once: true });
})();
