import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@archive/result";
import { resolveActor } from "@archive/application/query/authorization/resolve-actor";
import {
  eventResource,
  getCommitteeRoleForEvent,
  organizationResource,
  projectResource,
} from "@archive/domain/authorization/logic";
import { authMiddleware } from "@/libs/auth";
import { cast } from "@archive/domain/shared/ids";
import { eventIdSchema } from "@archive/domain/event/schema";
import { orgIdSchema } from "@archive/domain/organization/schema";
import type { OrgId } from "@archive/domain/organization/schema";
import type { ProjectId } from "@archive/domain/project/schema";
import type { UserId } from "@archive/domain/user/schema";
import type { Action, Resource } from "@archive/domain/authorization/schema";
import { queryOptions } from "@tanstack/react-query";
import { dependenciesMiddleware } from "@/libs/dependencies";

/**
 * Server function to check current user's committee role for an event
 */
export const checkCommitteeRoleFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context.dependencies, {
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
    queryFn: async () => checkCommitteeRoleFn({ data: { eventId } }),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Server function to check committee management permissions
 * Returns capability flags for committee management operations (organizations, tags, places, deadlines, etc.)
 */
export const checkCommitteePermissionsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context.dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    const { authService } = context.dependencies;

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
      canManageDeadlines: check(eventRes, "event:update"),
      canManagePlaces: check(eventRes, "event:update"),
      canManageTags: check(eventRes, "event:update"),
      canCreateProject: check(projectRes, "project:create"),
      canUpdateProject: check(projectRes, "project:update"),
      canApproveProject: check(projectRes, "project:approve"),
    };
  });

export function generateCheckCommitteePermissionsQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: ["authorization", "committee-permissions", eventId],
    queryFn: async () => checkCommitteePermissionsFn({ data: { eventId } }),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Server function to check organization permissions
 * Returns capability flags for organization operations (member management, update, delete)
 */
export const checkOrganizationPermissionsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema, orgId: orgIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context.dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    const { authService } = context.dependencies;

    const check = (resource: Resource, action: Action): boolean => {
      const result = authService.isAllowed(actor, resource, action);
      return Result.isSuccess(result) && result.value;
    };

    const orgRes = organizationResource(cast<OrgId>(data.orgId), data.eventId);
    const projectRes = projectResource(cast<ProjectId>("_"), data.eventId, cast<OrgId>(data.orgId));

    return {
      canManageMembers: check(orgRes, "organization:manage_members"),
      canSubmitProject: check(projectRes, "project:submit"),
      canWithdrawSubmission: check(projectRes, "project:withdraw"),
    };
  });

export function generateCheckOrganizationPermissionsQueryOptions(eventId: string, orgId: string) {
  return queryOptions({
    queryKey: ["authorization", "organization-permissions", eventId, orgId],
    queryFn: async () => checkOrganizationPermissionsFn({ data: { eventId, orgId } }),
    staleTime: 5 * 60 * 1000,
  });
}
