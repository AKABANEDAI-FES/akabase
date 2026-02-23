import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@praha/byethrow";
import { authMiddleware } from "@/libs/session-server";
import { listUsersWithRoles } from "@/application/query/user/list-users-with-roles";
import { listUsersForEvent } from "@/application/query/user/list-users-for-event";
import { cast, eventIdSchema } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";

export const loadUsersWithRolesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const result = await listUsersWithRoles();

    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }

    return result.value;
  });

export const loadUsersForEventFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data }) => {
    const result = await listUsersForEvent(cast<EventId>(data.eventId));

    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }

    return result.value;
  });
