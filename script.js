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

function initializeGallery() {
  const stage = document.getElementById("gallery-stage");
  const previous = document.getElementById("gallery-prev");
  const next = document.getElementById("gallery-next");
  const playback = document.getElementById("gallery-playback");
  const counter = document.getElementById("gallery-counter");
  const caption = document.getElementById("gallery-caption");
  const status = document.getElementById("gallery-status");
  const announcement = document.getElementById("gallery-announcement");
  const dialog = document.getElementById("photo-dialog");
  const enlarged = document.getElementById("photo-enlarged");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const interval = 6000; // 6000ミリ秒 = 6秒。5000〜8000に変更できます。
  const placeholder = "images/tomogashima/placeholder.svg";
  const pauses = new Set();
  let current = 0;
  let requested = 0;
  let timer;
  let userPaused = reducedMotion.matches;
  let resumeAfter = 0;
  let requestId = 0;
  let pointerStart = null;
  let suppressClickUntil = 0;
  stage.disabled = true;

  if (!tomogashimaPhotos.length) {
    caption.textContent = "写真は準備中です。";
    counter.textContent = "0 / 0";
    stage.disabled = true;
    return;
  }

  // 画像を先に読み込み、未配置や読み込み失敗時は仮画像に置き換えます。
  const slides = tomogashimaPhotos.map((photo) => {
    const image = document.createElement("img");
    image.className = "gallery-slide";
    image.alt = photo.alt;
    image.width = 1200;
    image.height = 800;
    image.draggable = false;
    image.setAttribute("aria-hidden", "true");
    const ready = new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", () => {
        if (image.dataset.placeholder) { resolve(); return; }
        image.dataset.placeholder = "true";
        image.alt = `${photo.alt}（仮画像）`;
        image.src = placeholder;
      });
    });
    image.src = photo.src;
    return { image, ready };
  });
  stage.querySelector("img").remove();
  slides.forEach(({ image }) => stage.prepend(image));
  previous.disabled = next.disabled = playback.disabled = slides.length < 2;

  // 操作中・画面外・別タブ・拡大中はタイマーを止めます。
  function schedule() {
    clearTimeout(timer);
    playback.textContent = userPaused ? "再生" : "一時停止";
    playback.setAttribute("aria-pressed", String(userPaused));
    status.textContent = slides.length < 2 ? "" : userPaused ? "自動再生：停止中" : pauses.size ? "自動再生：一時停止中" : `自動再生：${interval / 1000}秒ごと`;
    if (userPaused || pauses.size || slides.length < 2) return;
    timer = setTimeout(() => show(current + 1), Math.max(interval, resumeAfter - Date.now()));
  }

  function pause(reason, active) {
    if (active) pauses.add(reason);
    else pauses.delete(reason);
    schedule();
  }

  async function show(index, manual = false) {
    clearTimeout(timer);
    const id = ++requestId;
    const target = (index + slides.length) % slides.length;
    requested = target;
    pauses.add("loading");
    if (manual) resumeAfter = Date.now() + interval;
    await slides[target].ready;
    if (id !== requestId) return; // 連続操作時、古い読み込み結果で戻らないようにします。
    current = target;
    pauses.delete("loading");
    stage.disabled = false;
    slides.forEach(({ image }, i) => {
      image.classList.toggle("is-active", i === current);
      image.setAttribute("aria-hidden", String(i !== current));
    });
    counter.textContent = `${current + 1} / ${slides.length}`;
    counter.setAttribute("aria-label", `${slides.length}枚中${current + 1}枚目`);
    const photo = tomogashimaPhotos[current];
    caption.textContent = photo.caption + (slides[current].image.dataset.placeholder ? " · 仮画像" : "");
    stage.setAttribute("aria-label", `${photo.alt}を拡大する`);
    if (manual) announcement.textContent = `${counter.textContent}、${caption.textContent}`;
    schedule();
  }

  previous.addEventListener("click", () => show(requested - 1, true));
  next.addEventListener("click", () => show(requested + 1, true));
  playback.addEventListener("click", () => {
    userPaused = !userPaused;
    if (!userPaused) { pauses.delete("focus"); pauses.delete("hover"); }
    schedule();
  });
  gallery.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") pause("hover", true);
  });
  gallery.addEventListener("pointerleave", () => pause("hover", false));
  // タップ後に残るフォーカスでは止め続けず、キーボード操作中だけ停止します。
  gallery.addEventListener("focusin", (event) => pause("focus", event.target.matches(":focus-visible")));
  gallery.addEventListener("focusout", (event) => {
    if (!gallery.contains(event.relatedTarget)) pause("focus", false);
  });
  gallery.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      show(requested + (event.key === "ArrowLeft" ? -1 : 1), true);
    }
  });

  // 縦スクロールを妨げず、横に50px以上動いたときだけ写真を切り替えます。
  stage.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
    stage.setPointerCapture(event.pointerId);
    pause("pointer", true);
  });
  stage.addEventListener("pointerup", (event) => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    pause("pointer", false);
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      suppressClickUntil = Date.now() + 500;
      show(requested + (dx < 0 ? 1 : -1), true);
    }
  });
  function cancelPointer() { pointerStart = null; pause("pointer", false); }
  stage.addEventListener("pointercancel", cancelPointer);
  stage.addEventListener("lostpointercapture", cancelPointer);

  stage.addEventListener("click", () => {
    if (Date.now() < suppressClickUntil) return;
    pause("dialog", true);
    enlarged.src = slides[current].image.src;
    enlarged.alt = slides[current].image.alt;
    document.getElementById("photo-enlarged-caption").textContent = caption.textContent;
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
    stage.focus();
    pause("dialog", false);
    resumeAfter = Date.now() + interval;
    schedule();
  });
  document.addEventListener("visibilitychange", () => pause("hidden", document.hidden));
  pause("hidden", document.hidden);
  // スクロールして写真が画面外に出たときも停止します。
  if ("IntersectionObserver" in window) {
    pause("offscreen", true);
    new IntersectionObserver(([entry]) => pause("offscreen", !entry.isIntersecting), { threshold: 0.15 }).observe(stage);
  }
  reducedMotion.addEventListener("change", (event) => {
    if (event.matches) userPaused = true;
    schedule();
  });
  show(0);
}
