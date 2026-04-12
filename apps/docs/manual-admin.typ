// apps/docs/manual-admin.typ
#include "index.typ"
#include "chapters/_styles.typ"

// 表紙
#align(center + horizon)[
  #text(size: 24pt, weight: "bold")[AKABASE]
  #v(0.5em)
  #text(size: 18pt, weight: "bold")[ユーザーマニュアル]
  #v(1em)
  #text(size: 14pt, fill: luma(80))[管理者向け]
  #v(3em)
  #text(size: 11pt, fill: luma(120))[大学祭企画情報管理システム]
]

#pagebreak()

#outline(title: "目次", depth: 2)

#pagebreak()

#include "chapters/common/intro.typ"
#include "chapters/common/login.typ"
#include "chapters/admin/events.typ"
#include "chapters/admin/users.typ"
