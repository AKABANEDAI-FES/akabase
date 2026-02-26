import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listPlaces } from "@/application/query/event/list-places";
import { listProjects } from "@/application/query/project/list-projects";
import { getDraft } from "@/application/query/project/get-project-draft";
import { resolveActor } from "@/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/session-server";
import { cast, eventIdSchema, orgIdSchema, projectIdSchema } from "@/domain/shared/ids";
import type { UserId } from "@/domain/shared/ids";
import { queryOptions } from "@tanstack/react-query";
import { dependencies } from "@/infrastructure/di";

/**
 * Server function to load places for an event
 */
export const loadPlacesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data }) => {
    return await listPlaces(data.eventId);
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
  .inputValidator(z.object({ eventId: eventIdSchema, orgId: orgIdSchema }))
  .handler(async ({ data, context }) => {
    // Resolve actor from session
    const actor = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
      orgIds: [data.orgId],
    });

    // Query with authorization check
    return await listProjects(dependencies, data.eventId, data.orgId, actor);
  });

export function generateLoadProjectsCacheKey(eventId: string, orgId: string) {
  return ["projects", "for-organization", [eventId, orgId]];
}

export function generateLoadProjectsQueryOptions(eventId: string, orgId: string) {
  return queryOptions({
    queryKey: generateLoadProjectsCacheKey(eventId, orgId),
    queryFn: () => loadProjectsFn({ data: { eventId, orgId } }),
  });
}

/**
 * Server function to load draft for a project
 */
export const loadDraftFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({ eventId: eventIdSchema, orgId: orgIdSchema, projectId: projectIdSchema }),
  )
  .handler(async ({ data, context }) => {
    // Resolve actor from session
    const actor = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
      orgIds: [data.orgId],
    });

    // Query with authorization check
    return await getDraft(dependencies, data.eventId, data.orgId, data.projectId, actor);
  });

export function generateLoadDraftCacheKey(eventId: string, orgId: string, projectId: string) {
  return ["project-draft", [eventId, orgId, projectId]];
}

export function generateLoadDraftQueryOptions(eventId: string, orgId: string, projectId: string) {
  return queryOptions({
    queryKey: generateLoadDraftCacheKey(eventId, orgId, projectId),
    queryFn: () => loadDraftFn({ data: { eventId, orgId, projectId } }),
  });
}
