// ビューアーのイベントはページにつき一度だけ登録します。
const photoViewer = createPhotoViewer(document.getElementById("photo-dialog"));

function createPhotoViewer(dialog) {
  const stage = dialog.querySelector(".viewer-stage");
  const error = dialog.querySelector(".viewer-error");
  const closeButton = dialog.querySelector(".dialog-close");
  const prev = dialog.querySelector(".viewer-prev");
  const next = dialog.querySelector(".viewer-next");
  const title = dialog.querySelector("#viewer-album");
  const date = dialog.querySelector("#viewer-date");
  const count = dialog.querySelector("#viewer-count");
  const caption = dialog.querySelector("#photo-enlarged-caption");
  const status = dialog.querySelector("#viewer-status");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktop = window.matchMedia("(min-width: 900px) and (hover: hover) and (pointer: fine)");
  let session;
  let image;
  let fade;
  let gesture;
  let revision = 0;

  function placeNavigation() {
    if (!dialog.open) return;
    const box = stage.getBoundingClientRect();
    const imageWidth = image?.naturalHeight
      ? Math.min(box.width, box.height * image.naturalWidth / image.naturalHeight)
      : box.width;
    const gutter = (box.width - imageWidth) / 2;
    // containで描画される実寸を使い、画像を縮めず両側に余白がある場合だけ移動します。
    const leftEdge = prev.getBoundingClientRect().right;
    const rightEdge = next.getBoundingClientRect().left;
    const canUseSides = desktop.matches && !next.disabled &&
      leftEdge + 12 <= box.left + gutter && rightEdge - 12 >= box.right - gutter;
    dialog.classList.toggle("viewer-side-nav", canUseSides);
    if (canUseSides) {
      const center = box.top - dialog.getBoundingClientRect().top + box.height / 2;
      dialog.style.setProperty("--viewer-stage-center", center + "px");
    }
  }

  async function render(index) {
    const active = session;
    if (!active) return;
    const request = ++revision;
    const total = active.album.photos.length;
    active.index = (index + total) % total;
    const photo = active.album.photos[active.index];
    const number = String(active.index + 1).padStart(2, "0");
    const counter = "IMAGE " + number + " / " + String(total).padStart(2, "0");
    error.hidden = true;
    status.textContent = "写真を読み込み中…";
    if (!image) caption.textContent = status.textContent;

    // 次の写真をデコードしてから差し替え、読み込み中は現在の写真を保持します。
    const incoming = new Image();
    incoming.alt = photo.alt;
    incoming.draggable = false;
    incoming.src = photo.src;
    let loaded = true;
    try {
      await incoming.decode();
    } catch {
      loaded = false;
    }
    if (request !== revision || session !== active || !dialog.open) return;

    fade?.cancel();
    image?.remove();
    image = null;
    count.textContent = counter;
    caption.textContent = photo.caption;
    status.textContent = loaded ? "" : error.textContent;
    error.hidden = loaded;
    if (!loaded) { placeNavigation(); return; }

    incoming.id = "photo-enlarged";
    image = incoming;
    stage.append(image);
    placeNavigation();
    if (!motion.matches && image.animate) {
      fade = image.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 190, easing: "ease-out" });
    }
  }

  function step(direction) {
    if (session?.album.photos.length > 1) render(session.index + direction);
  }

  function finish(restoreFocus = true) {
    const active = session;
    if (!active) return;
    session = null;
    ++revision;
    gesture = null;
    fade?.cancel();
    image?.remove();
    image = null;
    dialog.classList.remove("viewer-side-nav");
    dialog.style.removeProperty("--viewer-stage-center");
    document.documentElement.classList.remove("photo-viewing");
    document.body.style.removeProperty("--viewer-scroll-y");
    window.scrollTo({ left: active.x, top: active.y, behavior: "instant" });
    if (restoreFocus) active.onClose();
  }

  function close(restoreFocus = true) {
    if (dialog.open) dialog.close();
    finish(restoreFocus);
  }

  function open(album, index, onClose) {
    if (dialog.open || !album.photos[index]) return;
    session = { album, index, onClose, x: window.scrollX, y: window.scrollY };
    title.textContent = album.title.toUpperCase() + " / " + album.titleJa;
    date.textContent = album.displayDate || "DATE UNKNOWN";
    count.textContent = "";
    caption.textContent = "";
    prev.disabled = next.disabled = album.photos.length < 2;
    document.body.style.setProperty("--viewer-scroll-y", -session.y + "px");
    document.documentElement.classList.add("photo-viewing");
    dialog.showModal();
    render(index);
  }

  closeButton.addEventListener("click", () => close());
  prev.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));
  dialog.addEventListener("close", () => { if (!dialog.open) finish(); });
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    step(event.key === "ArrowLeft" ? -1 : 1);
  });
  stage.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.pointerType === "mouse") return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener("pointerup", (event) => {
    if (gesture?.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    gesture = null;
    if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.3) step(dx < 0 ? 1 : -1);
  });
  function cancelGesture(event) { if (gesture?.id === event.pointerId) gesture = null; }
  stage.addEventListener("pointercancel", cancelGesture);
  stage.addEventListener("lostpointercapture", cancelGesture);
  motion.addEventListener("change", () => { if (motion.matches) fade?.cancel(); });
  desktop.addEventListener("change", placeNavigation);
  new ResizeObserver(placeNavigation).observe(stage);
  return { open, close };
}
