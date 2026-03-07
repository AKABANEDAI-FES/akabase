import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listPlaces } from "@/application/query/event/list-places";
import { listProjects } from "@/application/query/project/list-projects";
import { getDraft } from "@/application/query/project/get-project-draft";
import { getProjectDetail } from "@/application/query/project/get-project-detail";
import { getProjectPublished } from "@/application/query/project/get-project-published";
import { listSubmissions } from "@/application/query/project/list-submissions";
import { listEventSubmissions } from "@/application/query/project/list-event-submissions";
import { getSubmissionDetail } from "@/application/query/project/get-submission-detail";
import { getSubmissionStats } from "@/application/query/project/get-submission-stats";
import { listRecentActivities } from "@/application/query/project/list-recent-activities";
import { listEventPublishedData } from "@/application/query/project/list-event-published-data";
import { resolveActor } from "@/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/session-server";
import {
  cast,
  eventIdSchema,
  orgIdSchema,
  projectIdSchema,
  submissionIdSchema,
} from "@/domain/shared/ids";
import type { UserId } from "@/domain/shared/ids";
import { queryOptions } from "@tanstack/react-query";
import { dependencies } from "@/infrastructure/di";
import { NotFoundError } from "@/libs/error";

/**
 * Server function to load places for an event
 */
export const loadPlacesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data }) => {
    return await listPlaces(dependencies, data.eventId);
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
    const actor = await resolveActor(dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
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
    const actor = await resolveActor(dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    // Query with authorization check
    const draft = await getDraft(dependencies, data.eventId, data.orgId, data.projectId, actor);

    if (!draft) {
      throw new NotFoundError("プロジェクトのドラフトが見つかりません。");
    }

    return draft;
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

/**
 * Server function to load project detail
 */
export const loadProjectDetailFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({ eventId: eventIdSchema, orgId: orgIdSchema, projectId: projectIdSchema }),
  )
  .handler(async ({ data, context }) => {
    // Resolve actor from session
    const actor = await resolveActor(dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    // Query with authorization check
    const project = await getProjectDetail(
      dependencies,
      data.eventId,
      data.orgId,
      data.projectId,
      actor,
    );

    if (!project) {
      throw new NotFoundError("プロジェクトが見つかりません。");
    }

    return project;
  });

export function generateLoadProjectDetailCacheKey(
  eventId: string,
  orgId: string,
  projectId: string,
) {
  return ["project-detail", [eventId, orgId, projectId]];
}

export function generateLoadProjectDetailQueryOptions(
  eventId: string,
  orgId: string,
  projectId: string,
) {
  return queryOptions({
    queryKey: generateLoadProjectDetailCacheKey(eventId, orgId, projectId),
    queryFn: () => loadProjectDetailFn({ data: { eventId, orgId, projectId } }),
  });
}

/**
 * Server function to load submissions for a project
 */
export const loadSubmissionsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({ eventId: eventIdSchema, orgId: orgIdSchema, projectId: projectIdSchema }),
  )
  .handler(async ({ data, context }) => {
    // Resolve actor from session
    const actor = await resolveActor(dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    // Query with authorization check
    return await listSubmissions(dependencies, data.eventId, data.orgId, data.projectId, actor);
  });

export function generateLoadSubmissionsCacheKey(eventId: string, orgId: string, projectId: string) {
  return ["submissions", "for-project", [eventId, orgId, projectId]];
}

export function generateLoadSubmissionsQueryOptions(
  eventId: string,
  orgId: string,
  projectId: string,
) {
  return queryOptions({
    queryKey: generateLoadSubmissionsCacheKey(eventId, orgId, projectId),
    queryFn: () => loadSubmissionsFn({ data: { eventId, orgId, projectId } }),
  });
}

/**
 * Server function to load all submissions for an event
 */
export const loadEventSubmissionsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    // Resolve actor from session
    const actor = await resolveActor(dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    // Query with authorization check
    return await listEventSubmissions(dependencies, data.eventId, actor);
  });

export function generateLoadEventSubmissionsCacheKey(eventId: string) {
  return ["submissions", "for-event", eventId];
}

export function generateLoadEventSubmissionsQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadEventSubmissionsCacheKey(eventId),
    queryFn: () => loadEventSubmissionsFn({ data: { eventId } }),
  });
}

/**
 * Server function to load published data for a project
 */
export const loadProjectPublishedFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({ eventId: eventIdSchema, orgId: orgIdSchema, projectId: projectIdSchema }),
  )
  .handler(async ({ data, context }) => {
    // Resolve actor from session
    const actor = await resolveActor(dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    // Query with authorization check
    return await getProjectPublished(dependencies, data.eventId, data.orgId, data.projectId, actor);
  });

export function generateLoadProjectPublishedCacheKey(
  eventId: string,
  orgId: string,
  projectId: string,
) {
  return ["project-published", [eventId, orgId, projectId]];
}

export function generateLoadProjectPublishedQueryOptions(
  eventId: string,
  orgId: string,
  projectId: string,
) {
  return queryOptions({
    queryKey: generateLoadProjectPublishedCacheKey(eventId, orgId, projectId),
    queryFn: () => loadProjectPublishedFn({ data: { eventId, orgId, projectId } }),
  });
}

/**
 * Server function to load submission detail (committee view)
 */
export const loadSubmissionDetailFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      eventId: eventIdSchema,
      submissionId: submissionIdSchema,
    }),
  )
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    const detail = await getSubmissionDetail(dependencies, data.eventId, data.submissionId, actor);
    if (!detail) {
      throw new NotFoundError("提出が見つかりません。");
    }
    return detail;
  });

export function generateLoadSubmissionDetailCacheKey(eventId: string, submissionId: string) {
  return ["submission-detail", [eventId, submissionId]];
}

export function generateLoadSubmissionDetailQueryOptions(eventId: string, submissionId: string) {
  return queryOptions({
    queryKey: generateLoadSubmissionDetailCacheKey(eventId, submissionId),
    queryFn: () => loadSubmissionDetailFn({ data: { eventId, submissionId } }),
  });
}

/**
 * Server function to load submission statistics for an event (committee only)
 */
export const loadSubmissionStatsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    return await getSubmissionStats(dependencies, data.eventId, actor);
  });

export function generateLoadSubmissionStatsCacheKey(eventId: string) {
  return ["submission-stats", "for-event", eventId];
}

export function generateLoadSubmissionStatsQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadSubmissionStatsCacheKey(eventId),
    queryFn: () => loadSubmissionStatsFn({ data: { eventId } }),
  });
}

/**
 * Server function to load recent activities for user's organizations
 */
export const loadRecentActivitiesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(dependencies, {
      userId: cast<UserId>(context.session.user.id),
    });

    return await listRecentActivities(dependencies, data.eventId, actor);
  });

export function generateLoadRecentActivitiesCacheKey(eventId: string) {
  return ["recent-activities", "for-event", eventId];
}

export function generateLoadRecentActivitiesQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadRecentActivitiesCacheKey(eventId),
    queryFn: () => loadRecentActivitiesFn({ data: { eventId } }),
  });
}

/**
 * Server function to load all published data for an event (for export)
 */
export const loadEventPublishedDataFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    return await listEventPublishedData(dependencies, data.eventId, actor);
  });

export function generateLoadEventPublishedDataCacheKey(eventId: string) {
  return ["published-data", "for-event", eventId];
}

export function generateLoadEventPublishedDataQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadEventPublishedDataCacheKey(eventId),
    queryFn: () => loadEventPublishedDataFn({ data: { eventId } }),
  });
}
