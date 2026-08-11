#import "_template.typ": template
#import "chapters/_styles.typ": note
#show: template.with(subtitle: "管理者向け")

#include "chapters/common/intro.typ"
#include "chapters/common/login.typ"

#pagebreak()

#include "chapters/admin/events.typ"
#include "chapters/admin/users.typ"
#include "chapters/admin/api-keys.typ"
