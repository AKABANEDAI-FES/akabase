import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@praha/byethrow";
import { listPlaces } from "@/application/query/event/list-places";
import { authMiddleware } from "@/libs/session-server";
import { eventIdSchema, orgIdSchema } from "@/domain/shared/ids";
import { queryOptions } from "@tanstack/react-query";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { dependencies } from "@/infrastructure/di";

/**
 * Server function to load places for an event
 */
export const loadPlacesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data }) => {
    const result = await listPlaces(data.eventId);

    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }

    return result.value;
  });

export function generateLoadPlacesCacheKey(eventId: string) {
  return ["places", "for-event", eventId];
}

export function generateLoadPlacesQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadPlacesCacheKey(eventId),
    queryFn: () => loadPlacesFn({ data: { eventId } }),
  });
}

/**
 * Server function to load projects for an organization
 */
export const loadProjectsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ orgId: orgIdSchema }))
  .handler(async ({ data }) => {
    // Direct query - simple list, no complex joins needed
    const rows = await db.query.projects.findMany({
      where: eq(projects.orgId, data.orgId),
      orderBy: [desc(projects.createdAt)],
    });

    return rows;
  });

export function generateLoadProjectsCacheKey(orgId: string) {
  return ["projects", "for-organization", orgId];
}

export function generateLoadProjectsQueryOptions(orgId: string) {
  return queryOptions({
    queryKey: generateLoadProjectsCacheKey(orgId),
    queryFn: () => loadProjectsFn({ data: { orgId } }),
  });
}

/**
 * Server function to load organization detail (for displaying org name)
 */
export const loadOrganizationDetailFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema, orgId: orgIdSchema }))
  .handler(async ({ data }) => {
    const result = await dependencies.organizationRepo.findById(data.eventId, data.orgId);

    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }

    if (!result.value) {
      throw new Error("組織が見つかりませんでした。");
    }

    return result.value;
  });

export function generateLoadOrganizationDetailCacheKey(orgId: string) {
  return ["organizations", orgId];
}

export function generateLoadOrganizationDetailQueryOptions(eventId: string, orgId: string) {
  return queryOptions({
    queryKey: generateLoadOrganizationDetailCacheKey(orgId),
    queryFn: () => loadOrganizationDetailFn({ data: { eventId, orgId } }),
  });
}
