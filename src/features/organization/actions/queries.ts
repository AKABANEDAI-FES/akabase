import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@praha/byethrow";
import { listOrganizations } from "@/application/query/organization/list-organizations";
import { getOrganizationDetail } from "@/application/query/organization/get-organization-detail";
import { listOrganizationMembers } from "@/application/query/organization/list-organization-members";
import { listMyOrganizations } from "@/application/query/organization/list-my-organizations";
import { searchUsersByEmail } from "@/application/query/user/search-users-by-email";
import { resolveActor } from "@/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/session-server";
import { cast, eventIdSchema, orgIdSchema } from "@/domain/shared/ids";
import type { UserId } from "@/domain/shared/ids";
import { queryOptions } from "@tanstack/react-query";

/**
 * Server function to load organizations for an event
 */
export const loadOrganizationsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data }) => {
    const result = await listOrganizations(data.eventId);

    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }

    return result.value;
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
  .inputValidator(z.object({ orgId: orgIdSchema }))
  .handler(async ({ data }) => {
    const result = await getOrganizationDetail(data.orgId);

    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }

    return result.value;
  });

export function generateLoadOrganizationDetailCacheKey(orgId: string) {
  return ["organizations", orgId];
}

export function generateLoadOrganizationDetailQueryOptions(orgId: string) {
  return queryOptions({
    queryKey: generateLoadOrganizationDetailCacheKey(orgId),
    queryFn: () => loadOrganizationDetailFn({ data: { orgId } }),
  });
}

/**
 * Server function to load organization members
 */
export const loadOrganizationMembersFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ orgId: orgIdSchema }))
  .handler(async ({ data }) => {
    const result = await listOrganizationMembers(data.orgId);

    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }

    return result.value;
  });

export function generateLoadOrganizationMembersCacheKey(orgId: string) {
  return ["organizations", orgId, "members"];
}

export function generateLoadOrganizationMembersQueryOptions(orgId: string) {
  return queryOptions({
    queryKey: generateLoadOrganizationMembersCacheKey(orgId),
    queryFn: () => loadOrganizationMembersFn({ data: { orgId } }),
  });
}

/**
 * Server function to search users by email (for adding members)
 */
export const searchUsersByEmailFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ query: z.string().min(1).max(256), eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const actorResult = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    if (Result.isFailure(actorResult)) {
      throw new Error(actorResult.error.message);
    }

    const result = await searchUsersByEmail(data.query, actorResult.value, data.eventId);

    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }

    return result.value;
  });

/**
 * Server function to load organizations the current user belongs to
 */
export const loadMyOrganizationsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const actorResult = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
    });

    if (Result.isFailure(actorResult)) {
      throw new Error(actorResult.error.message);
    }

    const result = await listMyOrganizations(data.eventId, actorResult.value);

    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }

    return result.value;
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
