import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@praha/byethrow";
import { resolveActor } from "@/application/query/authorization/resolve-actor";
import {
  eventResource,
  getCommitteeRoleForEvent,
  organizationResource,
  projectResource,
} from "@/domain/authorization/logic";
import { authMiddleware } from "@/libs/session-server";
import { cast, eventIdSchema, orgIdSchema } from "@/domain/shared/ids";
import type { OrgId, ProjectId, UserId } from "@/domain/shared/ids";
import type { Action, Resource } from "@/domain/authorization/schema";
import { queryOptions } from "@tanstack/react-query";
import { dependencies } from "@/infrastructure/di";

/**
 * Server function to check current user's committee role for an event
 */
export const checkCommitteeRoleFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    const committeeRole = getCommitteeRoleForEvent(actor, data.eventId);

    return {
      committeeRole,
    };
  });

/**
 * Generate query options for committee role check
 */
export function generateCheckCommitteeRoleQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: ["authorization", "committee-role", eventId],
    queryFn: () => checkCommitteeRoleFn({ data: { eventId } }),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Server function to check committee management permissions
 * Returns capability flags for committee management operations (organizations, tags, places, deadlines, etc.)
 */
export const checkCommitteePermissionsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    const { authService } = dependencies;

    const check = (resource: Resource, action: Action): boolean => {
      const result = authService.isAllowed(actor, resource, action);
      return Result.isSuccess(result) && result.value;
    };

    const eventRes = eventResource(data.eventId);
    // Dummy resources for capability checks (create/delete only use committeeRole, not orgId/projectId)
    const orgRes = organizationResource(cast<OrgId>("_"), data.eventId);
    const projectRes = projectResource(cast<ProjectId>("_"), data.eventId, cast<OrgId>("_"));

    return {
      canUpdateEvent: check(eventRes, "event:update"),
      canArchiveEvent: check(eventRes, "event:archive"),
      canActivateEvent: check(eventRes, "event:activate"),
      canCreateOrganization: check(orgRes, "organization:create"),
      canUpdateOrganization: check(orgRes, "organization:update"),
      canDeleteOrganization: check(orgRes, "organization:delete"),
      canManageOrgMembers: check(orgRes, "organization:manage_members"),
      canCreateDeadline: check(eventRes, "deadline:create"),
      canUpdateDeadline: check(eventRes, "deadline:update"),
      canDeleteDeadline: check(eventRes, "deadline:delete"),
      canCreatePlace: check(eventRes, "place:create"),
      canUpdatePlace: check(eventRes, "place:update"),
      canDeletePlace: check(eventRes, "place:delete"),
      canCreateTag: check(eventRes, "tag:create"),
      canUpdateTag: check(eventRes, "tag:update"),
      canDeleteTag: check(eventRes, "tag:delete"),
      canCreateProject: check(projectRes, "project:create"),
      canApproveProject: check(projectRes, "project:approve"),
    };
  });

export function generateCheckCommitteePermissionsQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: ["authorization", "committee-permissions", eventId],
    queryFn: () => checkCommitteePermissionsFn({ data: { eventId } }),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Server function to check organization permissions
 * Returns capability flags for organization operations (member management, update, delete)
 */
export const checkOrganizationPermissionsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema, orgId: orgIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
      orgIds: [data.orgId],
    });

    const { authService } = dependencies;

    const check = (resource: Resource, action: Action): boolean => {
      const result = authService.isAllowed(actor, resource, action);
      return Result.isSuccess(result) && result.value;
    };

    const orgRes = organizationResource(cast<OrgId>(data.orgId), data.eventId);

    return {
      canManageMembers: check(orgRes, "organization:manage_members"),
    };
  });

export function generateCheckOrganizationPermissionsQueryOptions(eventId: string, orgId: string) {
  return queryOptions({
    queryKey: ["authorization", "organization-permissions", eventId, orgId],
    queryFn: () => checkOrganizationPermissionsFn({ data: { eventId, orgId } }),
    staleTime: 5 * 60 * 1000,
  });
}
