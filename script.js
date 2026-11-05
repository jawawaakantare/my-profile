// フッターの年を自動更新します。
// HTML内の id="year" がついた要素を探して、今年の年を入れます。
const yearElement = document.getElementById("year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// 選択UIと写真カルーセルを分離します。選択リストの横スワイプはブラウザーに任せます。
if (document.getElementById("album-selector")) initializeAlbumSelect();

function initializeAlbumSelect() {
  const albums = sortAlbums(photoAlbums);
  const selector = document.getElementById("album-selector");
  const list = document.getElementById("album-list");
  const panel = document.getElementById("album-panel");
  const previous = document.getElementById("album-previous");
  const next = document.getElementById("album-next");
  const position = document.getElementById("album-position");
  const announcement = document.getElementById("album-announcement");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let selected = -1;
  let version = 0;
  let lifecycle;
  let animation;
  const tabs = [];
  document.getElementById("album-record-count").textContent = String(albums.length).padStart(2, "0") + " RECORDS";
  previous.disabled = next.disabled = albums.length < 2;

  albums.forEach((album, index) => {
    const button = document.createElement("button");
    button.className = "album-tab";
    button.type = "button";
    button.id = "album-tab-" + album.id;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", "album-panel");
    button.setAttribute("aria-selected", "false");
    button.tabIndex = -1;
    const code = document.createElement("span");
    code.className = "album-tab-number";
    code.textContent = album.number;
    const title = document.createElement("strong");
    title.textContent = album.title.toUpperCase();
    const subtitle = document.createElement("span");
    subtitle.className = "album-tab-detail";
    subtitle.textContent = album.titleJa + " / " + album.photos.length + " IMAGES";
    button.append(code, title, subtitle);
    button.addEventListener("click", () => select(index));
    button.addEventListener("keydown", (event) => {
      let target;
      if (event.key === "ArrowRight") target = (index + 1) % albums.length;
      if (event.key === "ArrowLeft") target = (index - 1 + albums.length) % albums.length;
      if (event.key === "Home") target = 0;
      if (event.key === "End") target = albums.length - 1;
      if (target === undefined) return;
      event.preventDefault();
      tabs[target].focus({ preventScroll: true });
      select(target);
    });
    tabs.push(button);
    list.append(button);
  });

  previous.addEventListener("click", () => select((selected - 1 + albums.length) % albums.length));
  next.addEventListener("click", () => select((selected + 1) % albums.length));
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) animation?.finish();
  });

  async function select(index, initial = false) {
    if (index === selected || !albums[index]) return;
    const request = ++version;
    const opacity = getComputedStyle(panel).opacity;
    animation?.cancel();
    lifecycle?.abort(); // 旧画像読み込み、rAF、タイマー、イベント、Observerをすべて解除します。
    lifecycle = new AbortController();
    const signal = lifecycle.signal;
    selected = index;
    panel.inert = true;
    panel.setAttribute("aria-busy", "true");
    panel.dataset.loading = "true";
    tabs.forEach((tab, i) => {
      tab.setAttribute("aria-selected", String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    position.textContent = albums[index].number + " / " + String(albums.length).padStart(2, "0");
    if (!initial) tabs[index].scrollIntoView({ block: "nearest", inline: "nearest", behavior: reducedMotion.matches ? "auto" : "smooth" });

    try {
      if (!initial && !reducedMotion.matches && panel.animate) {
        panel.style.opacity = opacity;
        animation = panel.animate([{ opacity }, { opacity: 0 }], { duration: 120, fill: "forwards" });
        await animation.finished;
      }
      if (request !== version) return;
      panel.style.opacity = "0";
      animation?.cancel();
      const album = albums[index];
      panel.dataset.album = album.id;
      panel.setAttribute("aria-labelledby", tabs[index].id);
      document.getElementById("selected-album-code").textContent = "FIELD RECORD / ALBUM." + album.number;
      document.getElementById("album-title-text").textContent = album.title;
      document.getElementById("album-title-ja").textContent = "/ " + album.titleJa;
      document.getElementById("album-description").textContent = album.description;
      document.getElementById("album-date-value").textContent = album.displayDate || "DATE UNKNOWN";
      document.getElementById("photo-stream-count").textContent = album.photos.length + " IMAGES";
      const stage = panel.querySelector(".gallery-stage");
      stage.setAttribute("aria-label", album.titleJa + "の写真一覧");
      panel.querySelector("[role='status']").textContent = "写真を読み込み中…";
      const fallback = document.createElement("img");
      if (album.photos[0]) {
        fallback.src = album.photos[0].src;
        fallback.alt = album.photos[0].alt;
      }
      panel.querySelector(".gallery-track").replaceChildren(...(album.photos.length ? [fallback] : []));
      panel.querySelector(".gallery-playback").disabled = true;
      await initializeGallery(panel, album, signal);
      if (request !== version || signal.aborted) return;
      panel.dataset.loading = "false";
      // 読み込み中は選択パネルのフォーカスを維持し、新しい写真へ勝手に移動しません。
      if (!initial && !reducedMotion.matches && panel.animate) {
        animation = panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 130, fill: "forwards" });
        await animation.finished;
      }
      if (request !== version) return;
      panel.style.opacity = "";
      animation?.cancel();
      panel.inert = false;
      panel.setAttribute("aria-busy", "false");
      if (!initial) announcement.textContent = album.number + "、" + album.title + " / " + album.titleJa + "、" + album.displayDate + "、" + album.photos.length + "枚";
    } catch (error) {
      if (request !== version || signal.aborted || error.name === "AbortError") return;
      panel.style.opacity = "";
      panel.inert = false;
      panel.setAttribute("aria-busy", "false");
      panel.dataset.loading = "false";
      panel.querySelector("[role='status']").textContent = "写真の読み込みに失敗しました。別のアルバムを選択してください。";
      console.error(error);
    }
  }
  if (albums.length) select(0, true);
  else {
    selector.hidden = true;
    panel.querySelector("[role='status']").textContent = "アルバムは準備中です。";
  }
}

async function initializeGallery(gallery, album, signal) {
  const photoList = album.photos;
  // 検索範囲と再生状態をアルバム内に閉じ、別アルバムの操作と混ざらないようにします。
  const stage = gallery.querySelector(".gallery-stage");
  const track = gallery.querySelector(".gallery-track");
  const playback = gallery.querySelector(".gallery-playback");
  const status = gallery.querySelector("[role='status']");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const loopSeconds = 50; // 写真列が1周する秒数。40〜60秒を目安に調整できます。
  const resumeDelay = 3000;
  const pauses = new Set(["loading"]);
  let userPaused = false;
  let cycleWidth = 0;
  let offset = 0;
  let frame = null;
  let lastTime = null;
  let resumeTimer;
  let resumeAfter = 0;
  let pointer = null;
  let suppressClickUntil = 0;
  let resizeObserver;
  let visibilityObserver;
  function listen(target, type, callback) {
    target.addEventListener(type, callback, { signal });
  }
  signal.addEventListener("abort", () => {
    cancelAnimationFrame(frame);
    clearTimeout(resumeTimer);
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    const captured = pointer?.id;
    pointer = null;
    if (captured !== undefined && stage.hasPointerCapture(captured)) stage.releasePointerCapture(captured);
    stage.classList.remove("is-dragging");
    photoViewer.close(false);
    track.style.transform = "";
  }, { once: true });

  if (!photoList.length) {
    track.replaceChildren();
    status.textContent = "写真は準備中です。";
    return;
  }

  // 全画像の寸法が確定してから列を複製し、読み込みによる継ぎ目のずれを防ぎます。
  const photos = await Promise.all(photoList.map(async (photo) => {
    const image = new Image();
    image.alt = photo.alt;
    image.draggable = false;
    await new Promise((resolve) => {
      function cancelLoad() {
        image.onload = image.onerror = null;
        image.removeAttribute("src");
        resolve();
      }
      signal.addEventListener("abort", cancelLoad, { once: true });
      image.onload = () => { signal.removeEventListener("abort", cancelLoad); resolve(); };
      image.onerror = () => {
        if (image.dataset.placeholder) { signal.removeEventListener("abort", cancelLoad); resolve(); return; }
        image.dataset.placeholder = "true";
        image.alt = `${photo.alt}（仮画像）`;
        image.src = "images/tomogashima/placeholder.svg";
      };
      image.src = photo.src;
    });
    image.onload = image.onerror = null;
    return { ...photo, image, ratio: (image.naturalWidth || 1200) / (image.naturalHeight || 800) };
  }));

  if (signal.aborted) return;

  function makeGroup(copy = false) {
    const group = document.createElement("div");
    group.className = "gallery-group";
    if (copy) group.setAttribute("aria-hidden", "true");
    photos.forEach((photo, index) => {
      const card = document.createElement("figure");
      card.className = "gallery-card";
      card.style.setProperty("--photo-ratio", photo.ratio);
      const button = document.createElement("button");
      button.className = "gallery-photo";
      button.type = "button";
      button.dataset.index = index;
      button.setAttribute("aria-label", `${photo.alt}を拡大する`);
      if (copy) button.tabIndex = -1;
      button.append(photo.image.cloneNode());
      const expand = document.createElement("span");
      expand.className = "gallery-expand";
      expand.setAttribute("aria-hidden", "true");
      expand.textContent = "↗ 拡大";
      button.append(expand);
      const caption = document.createElement("figcaption");
      caption.textContent = photo.caption + (photo.image.dataset.placeholder ? " · 仮画像" : "");
      card.append(button, caption);
      group.append(card);
    });
    return group;
  }

  const original = makeGroup();
  track.replaceChildren(original);

  // 両側に同じ列を置きます。瞬間的に戻しても、画面上の写真と余白は同じ位置です。
  function render() {
    if (!cycleWidth) return;
    offset = cycleWidth + ((offset - cycleWidth) % cycleWidth + cycleWidth) % cycleWidth;
    track.style.transform = `translate3d(${-offset}px, 0, 0)`;
  }

  function measure() {
    if (signal.aborted) return;
    const phase = cycleWidth ? (offset - cycleWidth) / cycleWidth : 0;
    cycleWidth = original.getBoundingClientRect().width;
    if (!cycleWidth) return;
    // 写真が少ない場合も、画面の両端まで十分に複製します。
    const followingCopies = Math.max(2, Math.ceil(stage.clientWidth / cycleWidth) + 1);
    track.replaceChildren(makeGroup(true), original);
    for (let i = 0; i < followingCopies; i++) track.append(makeGroup(true));
    offset = cycleWidth * (1 + phase);
    render();
    updatePlayback();
  }

  function animate(time) {
    frame = null;
    if (signal.aborted) return;
    if (reducedMotion.matches) { updatePlayback(); return; }
    if (lastTime !== null) {
      // 別タブや処理の遅延後に大きく飛ばないようにします。
      offset += cycleWidth / (loopSeconds * 1000) * Math.min(time - lastTime, 64);
      render();
    }
    lastTime = time;
    frame = requestAnimationFrame(animate);
  }

  function updatePlayback() {
    if (signal.aborted) return;
    clearTimeout(resumeTimer);
    const waiting = performance.now() < resumeAfter;
    const stopped = reducedMotion.matches || userPaused || photos.length < 2;
    playback.disabled = reducedMotion.matches || photos.length < 2;
    playback.textContent = userPaused || reducedMotion.matches ? "再生" : "一時停止";
    playback.setAttribute("aria-pressed", String(userPaused || reducedMotion.matches));
    status.textContent = reducedMotion.matches ? "自動スクロール：停止（動きを減らす設定）" : stopped ? "自動スクロール：停止中" : pauses.size || waiting ? "自動スクロール：一時停止中" : "自動スクロール：ゆっくり移動中";
    if (stopped || pauses.size || waiting || !cycleWidth) {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      lastTime = null;
      if (waiting && !stopped && !pauses.size) resumeTimer = setTimeout(updatePlayback, resumeAfter - performance.now());
    } else if (frame === null) {
      lastTime = null;
      frame = requestAnimationFrame(animate);
    }
  }

  function pause(reason, active, delay = false) {
    if (active) pauses.add(reason);
    else pauses.delete(reason);
    if (delay) resumeAfter = performance.now() + resumeDelay;
    updatePlayback();
  }

  listen(playback, "click", () => {
    userPaused = !userPaused;
    pause("focus", false, true);
  });
  listen(gallery, "pointerenter", (event) => {
    if (event.pointerType === "mouse") pause("hover", true);
  });
  listen(gallery, "pointerleave", (event) => {
    if (event.pointerType === "mouse") pause("hover", false, true);
  });
  listen(gallery, "focusin", (event) => {
    if (!event.target.matches(":focus-visible")) return;
    pause("focus", true);
    if (event.target.matches(".gallery-photo")) {
      const card = event.target.parentElement;
      offset = cycleWidth + card.offsetLeft - original.offsetLeft;
      stage.scrollLeft = 0;
      render();
    }
  });
  listen(gallery, "focusout", (event) => {
    if (!gallery.contains(event.relatedTarget)) pause("focus", false, true);
  });
  listen(stage, "keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    offset += (event.key === "ArrowLeft" ? -1 : 1) * stage.clientWidth * 0.6;
    render();
    pause("focus", true, true);
  });

  // 横方向はドラッグ、縦方向はページスクロール。タップとドラッグを区別します。
  listen(stage, "pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0 || pointer) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, dragging: false };
    pause("pointer", true);
  });
  listen(window, "pointermove", (event) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      pointer.dragging = true;
      stage.setPointerCapture(event.pointerId);
      stage.classList.add("is-dragging");
    }
    if (pointer.dragging) {
      offset -= event.clientX - pointer.lastX;
      render();
    }
    pointer.lastX = event.clientX;
  });
  function finishPointer(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    if (pointer.dragging) suppressClickUntil = performance.now() + 500;
    const id = pointer.id;
    pointer = null;
    stage.classList.remove("is-dragging");
    if (stage.hasPointerCapture(id)) stage.releasePointerCapture(id);
    pause("pointer", false, true);
  }
  listen(window, "pointerup", finishPointer);
  listen(window, "pointercancel", finishPointer);
  listen(stage, "lostpointercapture", (event) => {
    // タッチの暗黙キャプチャを写真ボタンから枠へ移したときの通知は無視します。
    if (event.target === stage) finishPointer(event);
  });
  listen(window, "blur", () => {
    if (pointer) finishPointer({ pointerId: pointer.id });
    pause("window", true);
  });
  listen(window, "focus", () => pause("window", false, true));

  listen(stage, "click", (event) => {
    const button = event.target.closest(".gallery-photo");
    if (!button || performance.now() < suppressClickUntil) return;
    const index = Number(button.dataset.index);
    pause("dialog", true);
    photoViewer.open(album, index, () => {
      // 画面回転などで写真列を再生成していても、同じ写真へ戻します。
      const bounds = stage.getBoundingClientRect();
      const replacement = [...track.querySelectorAll(`.gallery-photo[data-index="${index}"]`)].find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return rect.right > bounds.left && rect.left < bounds.right;
      });
      const target = button.isConnected ? button : replacement || stage;
      target.focus({ preventScroll: true });
      pause("dialog", false, true);
    });
  });
  listen(document, "visibilitychange", () => pause("hidden", document.hidden));
  pause("hidden", document.hidden);
  if ("IntersectionObserver" in window) {
    pause("offscreen", true);
    visibilityObserver = new IntersectionObserver(([entry]) => pause("offscreen", !entry.isIntersecting));
    visibilityObserver.observe(stage);
  }
  listen(reducedMotion, "change", updatePlayback);
  pauses.delete("loading");
  resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(stage);
  measure();
}
