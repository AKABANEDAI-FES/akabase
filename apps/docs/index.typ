#set page(
  paper: "a4",
  margin: (top: 35mm, bottom: 30mm, left: 30mm, right: 30mm),
)
#set heading(numbering: "1.")
#set text(font: "Yu Mincho", lang: "ja", size: 11pt)
#show heading.where(level: 1): set text(size: 12pt)
#show heading.where(level: 2): set text(size: 12pt)
#show heading.where(level: 3): set text(size: 12pt)
#set par(
  justify: true,
  leading: 12pt,
  spacing: 24pt,
  first-line-indent: (
    all: true,
    amount: 1em,
  ),
)
#show heading: set block(above: 24pt, below: 24pt)
#show figure: set figure.caption(position: top)
#show figure: set block(breakable: true)
