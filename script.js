// フッターの年を自動更新します。
// HTML内の id="year" がついた要素を探して、今年の年を入れます。
const yearElement = document.getElementById("year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// 写真の追加・削除は、この一覧だけを編集します（表示はファイル名順）。
// src: 写真ファイルの場所 / alt: 写真の説明 / caption: 画面に出す短い説明
const tomogashimaPhotos = [
  { src: "assets/gallery/tomogashima/1000003477.jpg", alt: "友ヶ島のアーチ型の天井と、壁に差し込む光", caption: "Tomogashima — 1000003477" },
  { src: "assets/gallery/tomogashima/1000003487.jpg", alt: "友ヶ島の写真、1000003487", caption: "Tomogashima — 1000003487" },
  { src: "assets/gallery/tomogashima/1000003493.jpg", alt: "友ヶ島の写真、1000003493", caption: "Tomogashima — 1000003493" },
  { src: "assets/gallery/tomogashima/1000003499.jpg", alt: "友ヶ島の写真、1000003499", caption: "Tomogashima — 1000003499" },
  { src: "assets/gallery/tomogashima/1000003502.jpg", alt: "友ヶ島の写真、1000003502", caption: "Tomogashima — 1000003502" },
  { src: "assets/gallery/tomogashima/1000003510.jpg", alt: "友ヶ島の写真、1000003510", caption: "Tomogashima — 1000003510" },
  { src: "assets/gallery/tomogashima/1000003518.jpg", alt: "友ヶ島の写真、1000003518", caption: "Tomogashima — 1000003518" },
  { src: "assets/gallery/tomogashima/1000003525.jpg", alt: "青空の下に立つ友ヶ島の白い灯台", caption: "Tomogashima — 1000003525" },
].sort((a, b) => a.src.localeCompare(b.src, "en"));

const gallery = document.getElementById("tomogashima-gallery");
if (gallery) initializeGallery();

async function initializeGallery() {
  const stage = document.getElementById("gallery-stage");
  const track = document.getElementById("gallery-track");
  const playback = document.getElementById("gallery-playback");
  const status = document.getElementById("gallery-status");
  const dialog = document.getElementById("photo-dialog");
  const enlarged = document.getElementById("photo-enlarged");
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
  let returnFocus = null;

  if (!tomogashimaPhotos.length) {
    track.replaceChildren();
    status.textContent = "写真は準備中です。";
    return;
  }

  // 全画像の寸法が確定してから列を複製し、読み込みによる継ぎ目のずれを防ぎます。
  const photos = await Promise.all(tomogashimaPhotos.map(async (photo) => {
    const image = new Image();
    image.alt = photo.alt;
    image.draggable = false;
    await new Promise((resolve) => {
      image.onload = resolve;
      image.onerror = () => {
        if (image.dataset.placeholder) { resolve(); return; }
        image.dataset.placeholder = "true";
        image.alt = `${photo.alt}（仮画像）`;
        image.src = "images/tomogashima/placeholder.svg";
      };
      image.src = photo.src;
    });
    image.onload = image.onerror = null;
    return { ...photo, image, ratio: (image.naturalWidth || 1200) / (image.naturalHeight || 800) };
  }));

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

  playback.addEventListener("click", () => {
    userPaused = !userPaused;
    pause("focus", false, true);
  });
  gallery.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") pause("hover", true);
  });
  gallery.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse") pause("hover", false, true);
  });
  gallery.addEventListener("focusin", (event) => {
    if (!event.target.matches(":focus-visible")) return;
    pause("focus", true);
    if (event.target.matches(".gallery-photo")) {
      const card = event.target.parentElement;
      offset = cycleWidth + card.offsetLeft - original.offsetLeft;
      stage.scrollLeft = 0;
      render();
    }
  });
  gallery.addEventListener("focusout", (event) => {
    if (!gallery.contains(event.relatedTarget)) pause("focus", false, true);
  });
  stage.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    offset += (event.key === "ArrowLeft" ? -1 : 1) * stage.clientWidth * 0.6;
    render();
    pause("focus", true, true);
  });

  // 横方向はドラッグ、縦方向はページスクロール。タップとドラッグを区別します。
  stage.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0 || pointer) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, dragging: false };
    pause("pointer", true);
  });
  window.addEventListener("pointermove", (event) => {
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
  window.addEventListener("pointerup", finishPointer);
  window.addEventListener("pointercancel", finishPointer);
  stage.addEventListener("lostpointercapture", (event) => {
    // タッチの暗黙キャプチャを写真ボタンから枠へ移したときの通知は無視します。
    if (event.target === stage) finishPointer(event);
  });
  window.addEventListener("blur", () => {
    if (pointer) finishPointer({ pointerId: pointer.id });
    pause("window", true);
  });
  window.addEventListener("focus", () => pause("window", false, true));

  stage.addEventListener("click", (event) => {
    const button = event.target.closest(".gallery-photo");
    if (!button || performance.now() < suppressClickUntil) return;
    const photo = photos[Number(button.dataset.index)];
    returnFocus = button;
    pause("dialog", true);
    enlarged.src = photo.image.src;
    enlarged.alt = photo.image.alt;
    document.getElementById("photo-enlarged-caption").textContent = photo.caption;
    dialog.showModal();
    document.body.classList.add("photo-open");
  });
  document.getElementById("photo-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("photo-open");
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    else stage.focus({ preventScroll: true });
    pause("dialog", false, true);
  });
  document.addEventListener("visibilitychange", () => pause("hidden", document.hidden));
  pause("hidden", document.hidden);
  if ("IntersectionObserver" in window) {
    pause("offscreen", true);
    new IntersectionObserver(([entry]) => pause("offscreen", !entry.isIntersecting)).observe(stage);
  }
  reducedMotion.addEventListener("change", updatePlayback);
  pauses.delete("loading");
  new ResizeObserver(measure).observe(stage);
  measure();
}
