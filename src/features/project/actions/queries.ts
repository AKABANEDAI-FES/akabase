import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@praha/byethrow";
import { listPlaces } from "@/application/query/event/list-places";
import { listProjects } from "@/application/query/project/list-projects";
import { authMiddleware } from "@/libs/session-server";
import { eventIdSchema, orgIdSchema } from "@/domain/shared/ids";
import { queryOptions } from "@tanstack/react-query";

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
    const result = await listProjects(data.orgId);

    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }

    return result.value;
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
