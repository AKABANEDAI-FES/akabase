// apps/docs/manual-all.typ
#import "_template.typ": template
#import "chapters/_styles.typ": note, placeholder
#show: template.with(subtitle: "全役割版")

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
