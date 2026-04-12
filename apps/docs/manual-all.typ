// apps/docs/manual-all.typ
#include "index.typ"
#include "chapters/_styles.typ"

// 表紙
#align(center + horizon)[
  #text(size: 24pt, weight: "bold")[AKABASE]
  #v(0.5em)
  #text(size: 18pt, weight: "bold")[ユーザーマニュアル]
  #v(1em)
  #text(size: 14pt, fill: luma(80))[全役割版]
  #v(3em)
  #text(size: 11pt, fill: luma(120))[大学祭企画情報管理システム]
]

#pagebreak()

#outline(title: "目次", depth: 2)

#pagebreak()

// 共通
#include "chapters/common/intro.typ"
#include "chapters/common/login.typ"
// 出展団体向け
#include "chapters/org/home.typ"
#include "chapters/org/organization.typ"
#include "chapters/org/project-detail.typ"
#include "chapters/org/project-edit.typ"
#include "chapters/org/project-submit.typ"
#include "chapters/org/submission-history.typ"
// 委員会向け
#include "chapters/committee/submissions.typ"
#include "chapters/committee/organizations.typ"
#include "chapters/committee/tags-places.typ"
#include "chapters/committee/deadlines.typ"
#include "chapters/committee/members.typ"
#include "chapters/committee/export.typ"
// 管理者向け
#include "chapters/admin/events.typ"
#include "chapters/admin/users.typ"
