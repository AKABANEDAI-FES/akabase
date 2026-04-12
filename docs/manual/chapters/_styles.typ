// 注意・補足情報ボックス
// 使用例: #note[ここに注意事項]
#let note(body) = block(
  fill: luma(245),
  stroke: (left: 3pt + luma(160)),
  inset: (left: 12pt, top: 8pt, bottom: 8pt, right: 8pt),
  width: 100%,
)[#body]
