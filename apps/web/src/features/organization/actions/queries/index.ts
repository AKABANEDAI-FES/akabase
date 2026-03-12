import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listOrganizations } from "@archive/application/query/organization/list-organizations";
import { getOrganizationDetail } from "@archive/application/query/organization/get-organization-detail";
import { listMyOrganizations } from "@archive/application/query/organization/list-my-organizations";
import { resolveActor } from "@archive/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/auth";
import { dependenciesMiddleware } from "@/libs/dependencies";
import { cast } from "@archive/domain/shared/ids";
import { eventIdSchema } from "@archive/domain/event/schema";
import { orgIdSchema } from "@archive/domain/organization/schema";
import type { UserId } from "@archive/domain/user/schema";
import { queryOptions } from "@tanstack/react-query";
import { NotFoundError } from "@/libs/error";

/**
 * Server function to load organizations for an event
 */
export const loadOrganizationsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    return await listOrganizations(context.dependencies, data.eventId);
  });

export function generateLoadOrganizationsCacheKey(eventId: string) {
  return ["organizations", "for-event", eventId];
}

export function generateLoadOrganizationsQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadOrganizationsCacheKey(eventId),
    queryFn: async () => loadOrganizationsFn({ data: { eventId } }),
  });
}

/**
 * Server function to load organization detail
 */
export const loadOrganizationDetailFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema, orgId: orgIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context.dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    const organization = await getOrganizationDetail(
      context.dependencies,
      data.eventId,
      data.orgId,
      actor,
    );
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
    queryFn: async () => loadOrganizationDetailFn({ data: { eventId, orgId } }),
  });
}

/**
 * Server function to load organizations the current user belongs to
 */
export const loadMyOrganizationsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context.dependencies, {
      userId: cast<UserId>(context.session.user.id),
    });

    return await listMyOrganizations(context.dependencies, data.eventId, actor);
  });

export function generateLoadMyOrganizationsCacheKey(eventId: string) {
  return ["organizations", "my", eventId];
}

export function generateLoadMyOrganizationsQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadMyOrganizationsCacheKey(eventId),
    queryFn: async () => loadMyOrganizationsFn({ data: { eventId } }),
  });
}
