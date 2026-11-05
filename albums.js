// アルバムの編集はこのファイルだけで行います。HTMLは選択中の内容を表示する共通の枠です。
// photos配列の順番が写真の表示順になります。
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

// 新しいアルバムも、写真一覧と下の設定を追加すれば同じカルーセルを使えます。
const kasagiPhotos = Array.from({ length: 9 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return {
    src: `assets/gallery/camp-in-kasagi/camp-in-kasagi-${number}.webp`,
    alt: `笠置でキャンプの写真 ${number}`,
    caption: `Camp in Kasagi — ${number}`,
  };
});


// datesは並び替え用のISO日付、displayDateは画面用です。日付不明ならdatesは空にします。
const photoAlbums = [
  {
    id: "tomogashima", title: "Tomogashima", titleJa: "友ヶ島",
    dates: { start: "2026-08-20", end: "2026-08-20" }, displayDate: "2026.08.20",
    description: "島を歩いて、光を集める。", photos: tomogashimaPhotos,
  },
  {
    id: "camp-in-kasagi", title: "Camp in Kasagi", titleJa: "笠置でキャンプ",
    dates: { start: "2026-04-17", end: "2026-04-18" }, displayDate: "2026.04.17 - 2026.04.18",
    description: "“ミラとも“と、笠置でキャンプ。", photos: kasagiPhotos,
  },
];

// 最終撮影日の降順。同日は登録順を維持し、不明・不正な日付は最後にします。
function sortAlbums(albums) {
  function dateKey(album) {
    const value = album.dates?.end || album.dates?.start;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "";
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : "";
  }
  return albums.map((album, index) => ({ album, index, date: dateKey(album) }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.index - b.index)
    .map(({ album }, index) => ({ ...album, number: String(index + 1).padStart(2, "0") }));
}
