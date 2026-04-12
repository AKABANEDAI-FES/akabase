// apps/docs/manual-org.typ
#include "index.typ"
#include "chapters/_styles.typ"

// 表紙
#align(center + horizon)[
  #text(size: 24pt, weight: "bold")[AKABASE]
  #v(0.5em)
  #text(size: 18pt, weight: "bold")[ユーザーマニュアル]
  #v(1em)
  #text(size: 14pt, fill: luma(80))[出展団体向け]
  #v(3em)
  #text(size: 11pt, fill: luma(120))[大学祭企画情報管理システム]
]

#pagebreak()

#outline(title: "目次", depth: 2)

#pagebreak()

#include "chapters/common/intro.typ"
#include "chapters/common/login.typ"
#include "chapters/org/home.typ"
#include "chapters/org/organization.typ"
#include "chapters/org/project-detail.typ"
#include "chapters/org/project-edit.typ"
#include "chapters/org/project-submit.typ"
#include "chapters/org/submission-history.typ"
