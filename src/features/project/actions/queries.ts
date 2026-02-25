import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@praha/byethrow";
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
  .inputValidator(z.object({ eventId: eventIdSchema, orgId: orgIdSchema }))
  .handler(async ({ data, context }) => {
    // Resolve actor from session
    const actorResult = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
      orgIds: [data.orgId],
    });

    if (Result.isFailure(actorResult)) {
      throw new Error(actorResult.error.message);
    }

    // Query with authorization check
    const result = await listProjects(dependencies, data.eventId, data.orgId, actorResult.value);

    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }

    return result.value;
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
    const actorResult = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
      orgIds: [data.orgId],
    });

    if (Result.isFailure(actorResult)) {
      throw new Error(actorResult.error.message);
    }

    // Query with authorization check
    const result = await getDraft(
      dependencies,
      data.eventId,
      data.orgId,
      data.projectId,
      actorResult.value,
    );

    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }

    return result.value;
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
