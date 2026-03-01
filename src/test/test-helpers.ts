import type { Actor } from "@/domain/authorization/schema";
import { cast } from "@/domain/shared/ids";
import type { UserId } from "@/domain/shared/ids";

export function createAdminActor(userId: string = "test-admin-user"): Actor {
  return {
    userId: cast<UserId>(userId),
    globalRole: "admin",
    committeeRoles: new Map(),
    orgRoles: new Map(),
  };
}

export function createUserActor(userId: string = "test-user"): Actor {
  return {
    userId: cast<UserId>(userId),
    globalRole: "user",
    committeeRoles: new Map(),
    orgRoles: new Map(),
  };
}
