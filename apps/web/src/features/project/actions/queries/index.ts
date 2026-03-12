import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listProjects } from "@archive/application/query/project/list-projects";
import { getDraft } from "@archive/application/query/project/get-project-draft";
import { getProjectDetail } from "@archive/application/query/project/get-project-detail";
import { getProjectPublished } from "@archive/application/query/project/get-project-published";
import { listSubmissions } from "@archive/application/query/project/list-submissions";
import { listEventSubmissions } from "@archive/application/query/project/list-event-submissions";
import { getSubmissionDetail } from "@archive/application/query/project/get-submission-detail";
import { getSubmissionStats } from "@archive/application/query/project/get-submission-stats";
import { listRecentActivities } from "@archive/application/query/project/list-recent-activities";
import { listEventPublishedData } from "@archive/application/query/project/list-event-published-data";
import { resolveActor } from "@archive/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/auth";
import { dependenciesMiddleware } from "@/libs/dependencies";
import { cast } from "@archive/domain/shared/ids";
import { eventIdSchema } from "@archive/domain/event/schema";
import { orgIdSchema } from "@archive/domain/organization/schema";
import { projectIdSchema, submissionIdSchema } from "@archive/domain/project/schema";
import type { UserId } from "@archive/domain/user/schema";
import { queryOptions } from "@tanstack/react-query";
import { NotFoundError } from "@/libs/error";

/**
 * Server function to load projects for an organization
 */
export const loadProjectsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema, orgId: orgIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context.dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    return await listProjects(context.dependencies, data.eventId, data.orgId, actor);
  });

export function generateLoadProjectsCacheKey(eventId: string, orgId: string) {
  return ["projects", "for-organization", [eventId, orgId]];
}

export function generateLoadProjectsQueryOptions(eventId: string, orgId: string) {
  return queryOptions({
    queryKey: generateLoadProjectsCacheKey(eventId, orgId),
    queryFn: async () => loadProjectsFn({ data: { eventId, orgId } }),
  });
}

/**
 * Server function to load draft for a project
 */
export const loadDraftFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(
    z.object({ eventId: eventIdSchema, orgId: orgIdSchema, projectId: projectIdSchema }),
  )
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context.dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    const draft = await getDraft(
      context.dependencies,
      data.eventId,
      data.orgId,
      data.projectId,
      actor,
    );

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
    queryFn: async () => loadDraftFn({ data: { eventId, orgId, projectId } }),
  });
}

/**
 * Server function to load project detail
 */
export const loadProjectDetailFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(
    z.object({ eventId: eventIdSchema, orgId: orgIdSchema, projectId: projectIdSchema }),
  )
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context.dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    const project = await getProjectDetail(
      context.dependencies,
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
    queryFn: async () => loadProjectDetailFn({ data: { eventId, orgId, projectId } }),
  });
}

/**
 * Server function to load submissions for a project
 */
export const loadSubmissionsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(
    z.object({ eventId: eventIdSchema, orgId: orgIdSchema, projectId: projectIdSchema }),
  )
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context.dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    return await listSubmissions(
      context.dependencies,
      data.eventId,
      data.orgId,
      data.projectId,
      actor,
    );
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
    queryFn: async () => loadSubmissionsFn({ data: { eventId, orgId, projectId } }),
  });
}

/**
 * Server function to load all submissions for an event
 */
export const loadEventSubmissionsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context.dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    return await listEventSubmissions(context.dependencies, data.eventId, actor);
  });

export function generateLoadEventSubmissionsCacheKey(eventId: string) {
  return ["submissions", "for-event", eventId];
}

export function generateLoadEventSubmissionsQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadEventSubmissionsCacheKey(eventId),
    queryFn: async () => loadEventSubmissionsFn({ data: { eventId } }),
  });
}

/**
 * Server function to load published data for a project
 */
export const loadProjectPublishedFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(
    z.object({ eventId: eventIdSchema, orgId: orgIdSchema, projectId: projectIdSchema }),
  )
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context.dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    return await getProjectPublished(
      context.dependencies,
      data.eventId,
      data.orgId,
      data.projectId,
      actor,
    );
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
    queryFn: async () => loadProjectPublishedFn({ data: { eventId, orgId, projectId } }),
  });
}

/**
 * Server function to load submission detail (committee view)
 */
export const loadSubmissionDetailFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(
    z.object({
      eventId: eventIdSchema,
      submissionId: submissionIdSchema,
    }),
  )
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context.dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    const detail = await getSubmissionDetail(
      context.dependencies,
      data.eventId,
      data.submissionId,
      actor,
    );
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
    queryFn: async () => loadSubmissionDetailFn({ data: { eventId, submissionId } }),
  });
}

/**
 * Server function to load submission statistics for an event (committee only)
 */
export const loadSubmissionStatsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context.dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    return await getSubmissionStats(context.dependencies, data.eventId, actor);
  });

export function generateLoadSubmissionStatsCacheKey(eventId: string) {
  return ["submission-stats", "for-event", eventId];
}

export function generateLoadSubmissionStatsQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadSubmissionStatsCacheKey(eventId),
    queryFn: async () => loadSubmissionStatsFn({ data: { eventId } }),
  });
}

/**
 * Server function to load recent activities for user's organizations
 */
export const loadRecentActivitiesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context.dependencies, {
      userId: cast<UserId>(context.session.user.id),
    });

    return await listRecentActivities(context.dependencies, data.eventId, actor);
  });

export function generateLoadRecentActivitiesCacheKey(eventId: string) {
  return ["recent-activities", "for-event", eventId];
}

export function generateLoadRecentActivitiesQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadRecentActivitiesCacheKey(eventId),
    queryFn: async () => loadRecentActivitiesFn({ data: { eventId } }),
  });
}

/**
 * Server function to load all published data for an event (for export)
 */
export const loadEventPublishedDataFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context.dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    return await listEventPublishedData(context.dependencies, data.eventId, actor);
  });

export function generateLoadEventPublishedDataCacheKey(eventId: string) {
  return ["published-data", "for-event", eventId];
}

export function generateLoadEventPublishedDataQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadEventPublishedDataCacheKey(eventId),
    queryFn: async () => loadEventPublishedDataFn({ data: { eventId } }),
  });
}
