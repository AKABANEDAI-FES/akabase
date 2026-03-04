import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listOrganizations } from "@/application/query/organization/list-organizations";
import { getOrganizationDetail } from "@/application/query/organization/get-organization-detail";
import { listOrganizationMembers } from "@/application/query/organization/list-organization-members";
import { listMyOrganizations } from "@/application/query/organization/list-my-organizations";
import { resolveActor } from "@/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/session-server";
import { cast, eventIdSchema, orgIdSchema } from "@/domain/shared/ids";
import type { UserId } from "@/domain/shared/ids";
import { queryOptions } from "@tanstack/react-query";
import { dependencies } from "@/infrastructure/di";
import { NotFoundError } from "@/libs/error";

/**
 * Server function to load organizations for an event
 */
export const loadOrganizationsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data }) => {
    return await listOrganizations(dependencies, data.eventId);
  });

export function generateLoadOrganizationsCacheKey(eventId: string) {
  return ["organizations", "for-event", eventId];
}

export function generateLoadOrganizationsQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadOrganizationsCacheKey(eventId),
    queryFn: () => loadOrganizationsFn({ data: { eventId } }),
  });
}

/**
 * Server function to load organization detail
 */
export const loadOrganizationDetailFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema, orgId: orgIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    const organization = await getOrganizationDetail(dependencies, data.eventId, data.orgId, actor);
    if (!organization) {
      throw new NotFoundError("出展団体が見つかりませんでした");
    }
    return organization;
  });

export function generateLoadOrganizationDetailCacheKey(eventId: string, orgId: string) {
  return ["organizations", [eventId, orgId]];
}

export function generateLoadOrganizationDetailQueryOptions(eventId: string, orgId: string) {
  return queryOptions({
    queryKey: generateLoadOrganizationDetailCacheKey(eventId, orgId),
    queryFn: () => loadOrganizationDetailFn({ data: { eventId, orgId } }),
  });
}

/**
 * Server function to load organization members
 */
export const loadOrganizationMembersFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema, orgId: orgIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    return await listOrganizationMembers(dependencies, data.eventId, data.orgId, actor);
  });

export function generateLoadOrganizationMembersCacheKey(eventId: string, orgId: string) {
  return ["organizations", [eventId, orgId], "members"];
}

export function generateLoadOrganizationMembersQueryOptions(eventId: string, orgId: string) {
  return queryOptions({
    queryKey: generateLoadOrganizationMembersCacheKey(eventId, orgId),
    queryFn: () => loadOrganizationMembersFn({ data: { eventId, orgId } }),
  });
}

/**
 * Server function to load organizations the current user belongs to
 */
export const loadMyOrganizationsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(dependencies, {
      userId: cast<UserId>(context.session.user.id),
    });

    return await listMyOrganizations(dependencies, data.eventId, actor);
  });

export function generateLoadMyOrganizationsCacheKey(eventId: string) {
  return ["organizations", "my", eventId];
}

export function generateLoadMyOrganizationsQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadMyOrganizationsCacheKey(eventId),
    queryFn: () => loadMyOrganizationsFn({ data: { eventId } }),
  });
}
