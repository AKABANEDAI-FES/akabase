#let template(doc, subtitle: "") = {
  set page(
    paper: "a4",
    margin: (top: 35mm, bottom: 30mm, left: 30mm, right: 30mm),
  )
  set heading(numbering: "1.")
  set text(font: "Yu Mincho", lang: "ja", size: 11pt)
  show heading.where(level: 1): set text(size: 12pt)
  show heading.where(level: 2): set text(size: 12pt)
  show heading.where(level: 3): set text(size: 12pt)
  set par(
    justify: true,
    leading: 12pt,
    spacing: 24pt,
    first-line-indent: (
      all: true,
      amount: 1em,
    ),
  )
  show heading: set block(above: 24pt, below: 24pt)
  show figure: set figure.caption(position: top)
  show figure: set block(breakable: false)

  // 表紙
  align(center + horizon)[
    #text(size: 24pt, weight: "bold")[AKABASE]
    #v(0.5em)
    #text(size: 18pt, weight: "bold")[ユーザーマニュアル]
    #v(1em)
    #text(size: 14pt, fill: luma(80))[#subtitle]
    #v(3em)
    #text(size: 11pt, fill: luma(120))[大学祭企画情報管理システム]
  ]

  set page(numbering: "1", number-align: center + bottom)

  pagebreak()
  outline(title: "目次", depth: 2)
  pagebreak()

  doc
}
