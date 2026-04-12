// apps/docs/chapters/_styles.typ

// スクリーンショットのプレースホルダー
// 使用例: #placeholder("ホーム画面")
#let placeholder(caption) = figure(
  rect(
    width: 100%,
    height: 60mm,
    fill: luma(230),
    stroke: 1pt + luma(180),
    radius: 4pt,
  )[
    #align(center + horizon)[
      #text(fill: luma(120))[図: #caption]
    ]
  ],
  caption: caption,
)

// 注意・補足情報ボックス
// 使用例: #note[ここに注意事項]
#let note(body) = block(
  fill: luma(245),
  stroke: (left: 3pt + luma(160)),
  inset: (left: 12pt, top: 8pt, bottom: 8pt, right: 8pt),
  width: 100%,
)[#body]
