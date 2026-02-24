import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@praha/byethrow";
import { resolveActor } from "@/application/query/authorization/resolve-actor";
import {
  getCommitteeRoleForEvent,
  getOrgRoleForOrg,
  isGlobalAdmin,
} from "@/domain/authorization/logic";
import { authMiddleware } from "@/libs/session-server";
import { cast, eventIdSchema, orgIdSchema } from "@/domain/shared/ids";
import type { OrgId, UserId } from "@/domain/shared/ids";
import { queryOptions } from "@tanstack/react-query";

/**
 * Server function to check if current user is committee admin for an event
 */
export const checkIsCommitteeAdminFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const actorResult = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    if (Result.isFailure(actorResult)) {
      throw new Error(actorResult.error.message);
    }

    const committeeRole = getCommitteeRoleForEvent(actorResult.value, data.eventId);
    const isCommitteeAdmin = committeeRole === "admin";

    return {
      isCommitteeAdmin,
      committeeRole, // Include full role for potential future use
    };
  });

/**
 * Generate query options for committee admin check
 */
export function generateCheckIsCommitteeAdminQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: ["authorization", "committee-admin", eventId],
    queryFn: () => checkIsCommitteeAdminFn({ data: { eventId } }),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Server function to check if current user can manage organization members
 */
export const checkCanManageOrgMembersFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ orgId: orgIdSchema, eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const actorResult = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
      orgIds: [data.orgId as OrgId],
    });

    if (Result.isFailure(actorResult)) {
      throw new Error(actorResult.error.message);
    }

    const actor = actorResult.value;
    const canManageMembers =
      isGlobalAdmin(actor) || getOrgRoleForOrg(actor, data.orgId as OrgId) === "manager";

    return { canManageMembers };
  });

export function generateCheckCanManageOrgMembersQueryOptions(orgId: string, eventId: string) {
  return queryOptions({
    queryKey: ["authorization", "can-manage-org-members", orgId],
    queryFn: () => checkCanManageOrgMembersFn({ data: { orgId, eventId } }),
    staleTime: 5 * 60 * 1000,
  });
}
