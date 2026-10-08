// 移動そのものは標準のアンカーリンクに任せ、端末操作の反応だけ添えます。
(() => {
  const timers = new WeakMap();
  document.querySelectorAll('.section-nav .nav-panel').forEach((link) => {
    function feedback() {
      clearTimeout(timers.get(link));
      link.classList.remove('is-activating');
      // 同じパネルを連続して操作しても、光のラインを一度だけ再生します。
      void link.offsetWidth;
      link.classList.add('is-activating');
      timers.set(link, setTimeout(() => link.classList.remove('is-activating'), 450));
    }
    link.addEventListener('pointerdown', (event) => {
      if (event.isPrimary && event.button === 0) feedback();
    });
    link.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.repeat) feedback();
    });
  });
})();
