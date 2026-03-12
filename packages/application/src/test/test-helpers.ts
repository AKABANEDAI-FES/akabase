import type { Actor } from "@archive/domain/authorization/schema";
import { cast } from "@archive/domain/shared/ids";
import type { UserId } from "@archive/domain/user/schema";

export function createAdminActor(userId = "test-admin-user"): Actor {
  return {
    userId: cast<UserId>(userId),
    globalRole: "admin",
    committeeRoles: new Map(),
    orgRoles: new Map(),
  };
}

export function createUserActor(userId = "test-user"): Actor {
  return {
    userId: cast<UserId>(userId),
    globalRole: "user",
    committeeRoles: new Map(),
    orgRoles: new Map(),
  };
}
