import { Result } from "@praha/byethrow";
import { db } from "@/db";
import {
  projectDraftTags,
  projectDrafts,
  projectPublished,
  projectPublishedTags,
  projectSubmissionTags,
  projectSubmissions,
  projects,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  draftWithTagsSchema,
  projectSchema,
  projectSubmissionSchema,
  publishedWithTagsSchema,
  submissionWithTagsSchema,
} from "@/domain/project/schema";
import type {
  DraftWithTags,
  Project,
  ProjectSubmission,
  PublishedWithTags,
  SubmissionWithTags,
} from "@/domain/project/schema";
import type { OrgId, ProjectId, SubmissionId } from "@/domain/shared/ids";
import type { ProjectRepository } from "@/domain/project/repository";
import type { RepositoryError } from "@/domain/shared/repository";
import { repositoryError } from "@/domain/shared/repository";
import { generateId } from "@/libs/id";

/**
 * Project Repository Implementation using Drizzle ORM
 */
export class ProjectRepositoryImpl implements ProjectRepository {
  async findById(id: ProjectId): Promise<Result.Result<Project | null, RepositoryError>> {
    try {
      const row = await db.query.projects.findFirst({
        where: (projects, { eq }) => eq(projects.id, id),
      });

      if (!row) {
        return Result.succeed(null);
      }

      const project = projectSchema.parse({
        id: row.id,
        eventId: row.eventId,
        orgId: row.orgId,
        name: row.name,
        placeText: row.placeText,
        logoKey: row.logoKey,
        activeSubmissionId: row.activeSubmissionId,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      });

      return Result.succeed(project);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to find project", error));
    }
  }

  async findDraftWithTags(
    projectId: ProjectId,
  ): Promise<Result.Result<DraftWithTags | null, RepositoryError>> {
    try {
      const draftRow = await db.query.projectDrafts.findFirst({
        where: (projectDrafts, { eq }) => eq(projectDrafts.projectId, projectId),
      });

      if (!draftRow) {
        return Result.succeed(null);
      }

      // Fetch tags for this draft
      const tagRows = await db.query.projectDraftTags.findMany({
        where: (projectDraftTags, { eq }) => eq(projectDraftTags.projectId, projectId),
        columns: { tagId: true },
      });

      const draft = draftWithTagsSchema.parse({
        projectId: draftRow.projectId,
        pamphletText: draftRow.pamphletText,
        webContentJson: draftRow.webContentJson,
        updatedAt: new Date(draftRow.updatedAt),
        updatedBy: draftRow.updatedBy,
        tags: tagRows.map((r) => r.tagId),
      });

      return Result.succeed(draft);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to find draft", error));
    }
  }

  async findSubmissionById(
    id: SubmissionId,
  ): Promise<Result.Result<SubmissionWithTags | null, RepositoryError>> {
    try {
      const row = await db.query.projectSubmissions.findFirst({
        where: (projectSubmissions, { eq }) => eq(projectSubmissions.id, id),
      });

      if (!row) {
        return Result.succeed(null);
      }

      // Fetch tags for this submission
      const tagRows = await db.query.projectSubmissionTags.findMany({
        where: (projectSubmissionTags, { eq }) => eq(projectSubmissionTags.submissionId, id),
        columns: { tagId: true },
      });

      const submission = submissionWithTagsSchema.parse({
        id: row.id,
        projectId: row.projectId,
        status: row.status,
        pamphletText: row.pamphletText,
        webContentJson: row.webContentJson,
        submittedAt: new Date(row.submittedAt),
        submittedBy: row.submittedBy,
        decidedAt: row.decidedAt ? new Date(row.decidedAt) : null,
        decidedBy: row.decidedBy,
        tags: tagRows.map((r) => r.tagId),
      });

      return Result.succeed(submission);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to find submission", error));
    }
  }

  async findPublishedByProjectId(
    projectId: ProjectId,
  ): Promise<Result.Result<PublishedWithTags | null, RepositoryError>> {
    try {
      const row = await db.query.projectPublished.findFirst({
        where: (projectPublished, { eq }) => eq(projectPublished.projectId, projectId),
      });

      if (!row) {
        return Result.succeed(null);
      }

      // Fetch tags for published data
      const tagRows = await db.query.projectPublishedTags.findMany({
        where: (projectPublishedTags, { eq }) => eq(projectPublishedTags.projectId, projectId),
        columns: { tagId: true },
      });

      const published = publishedWithTagsSchema.parse({
        projectId: row.projectId,
        pamphletText: row.pamphletText,
        webContentJson: row.webContentJson,
        publishedAt: new Date(row.publishedAt),
        publishedBy: row.publishedBy,
        tags: tagRows.map((r) => r.tagId),
      });

      return Result.succeed(published);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to find published data", error));
    }
  }

  async listByOrganization(orgId: OrgId): Promise<Result.Result<Project[], RepositoryError>> {
    try {
      const rows = await db.query.projects.findMany({
        where: (projects, { eq }) => eq(projects.orgId, orgId),
      });

      const projectList: Project[] = rows.map((row) =>
        projectSchema.parse({
          id: row.id,
          eventId: row.eventId,
          orgId: row.orgId,
          name: row.name,
          placeText: row.placeText,
          logoKey: row.logoKey,
          activeSubmissionId: row.activeSubmissionId,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        }),
      );

      return Result.succeed(projectList);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to list projects", error));
    }
  }

  async listSubmissionsByProject(
    projectId: ProjectId,
  ): Promise<Result.Result<ProjectSubmission[], RepositoryError>> {
    try {
      const rows = await db.query.projectSubmissions.findMany({
        where: (projectSubmissions, { eq }) => eq(projectSubmissions.projectId, projectId),
      });

      const submissions: ProjectSubmission[] = rows.map((row) =>
        projectSubmissionSchema.parse({
          id: row.id,
          projectId: row.projectId,
          status: row.status,
          pamphletText: row.pamphletText,
          webContentJson: row.webContentJson,
          submittedAt: new Date(row.submittedAt),
          submittedBy: row.submittedBy,
          decidedAt: row.decidedAt ? new Date(row.decidedAt) : null,
          decidedBy: row.decidedBy,
        }),
      );

      return Result.succeed(submissions);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to list submissions", error));
    }
  }

  async saveProject(
    project: Project,
    draft: DraftWithTags,
  ): Promise<Result.Result<void, RepositoryError>> {
    try {
      // Upsert project
      await db
        .insert(projects)
        .values({
          id: project.id,
          eventId: project.eventId,
          orgId: project.orgId,
          name: project.name,
          placeText: project.placeText,
          logoKey: project.logoKey,
          activeSubmissionId: project.activeSubmissionId,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        })
        .onConflictDoUpdate({
          target: projects.id,
          set: {
            // Immutable fields excluded: id, eventId, orgId, createdAt
            name: project.name,
            placeText: project.placeText,
            logoKey: project.logoKey,
            activeSubmissionId: project.activeSubmissionId,
            updatedAt: project.updatedAt,
          },
          where: eq(projects.eventId, project.eventId),
        });

      // Upsert draft
      await db
        .insert(projectDrafts)
        .values({
          projectId: draft.projectId,
          pamphletText: draft.pamphletText,
          webContentJson: draft.webContentJson,
          updatedAt: draft.updatedAt,
          updatedBy: draft.updatedBy,
        })
        .onConflictDoUpdate({
          target: projectDrafts.projectId,
          set: {
            // Immutable fields excluded: projectId
            pamphletText: draft.pamphletText,
            webContentJson: draft.webContentJson,
            updatedAt: draft.updatedAt,
            updatedBy: draft.updatedBy,
          },
        });

      // Replace tags (delete + insert)
      await db.delete(projectDraftTags).where(eq(projectDraftTags.projectId, draft.projectId));

      if (draft.tags.length > 0) {
        await db.insert(projectDraftTags).values(
          draft.tags.map((tagId) => ({
            id: generateId(),
            projectId: draft.projectId,
            tagId,
          })),
        );
      }

      return Result.succeed(undefined);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to save project", error));
    }
  }

  async saveSubmission(
    submission: SubmissionWithTags,
  ): Promise<Result.Result<void, RepositoryError>> {
    try {
      // Upsert submission
      await db
        .insert(projectSubmissions)
        .values({
          id: submission.id,
          projectId: submission.projectId,
          status: submission.status,
          pamphletText: submission.pamphletText,
          webContentJson: submission.webContentJson,
          submittedAt: submission.submittedAt,
          submittedBy: submission.submittedBy,
          decidedAt: submission.decidedAt,
          decidedBy: submission.decidedBy,
        })
        .onConflictDoUpdate({
          target: projectSubmissions.id,
          set: {
            // Submission content is immutable, only status/decision can change
            status: submission.status,
            decidedAt: submission.decidedAt,
            decidedBy: submission.decidedBy,
            // Immutable fields excluded: id, projectId, pamphletText, webContentJson, submittedAt, submittedBy
          },
        });

      // Replace tags (delete + insert)
      await db
        .delete(projectSubmissionTags)
        .where(eq(projectSubmissionTags.submissionId, submission.id));

      if (submission.tags.length > 0) {
        await db.insert(projectSubmissionTags).values(
          submission.tags.map((tagId) => ({
            id: generateId(),
            submissionId: submission.id,
            tagId,
          })),
        );
      }

      return Result.succeed(undefined);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to save submission", error));
    }
  }

  async savePublished(published: PublishedWithTags): Promise<Result.Result<void, RepositoryError>> {
    try {
      // Upsert published data
      await db
        .insert(projectPublished)
        .values({
          projectId: published.projectId,
          pamphletText: published.pamphletText,
          webContentJson: published.webContentJson,
          publishedAt: published.publishedAt,
          publishedBy: published.publishedBy,
        })
        .onConflictDoUpdate({
          target: projectPublished.projectId,
          set: {
            pamphletText: published.pamphletText,
            webContentJson: published.webContentJson,
            publishedAt: published.publishedAt,
            publishedBy: published.publishedBy,
          },
        });

      // Update tags: delete old ones and insert new ones
      await db
        .delete(projectPublishedTags)
        .where(eq(projectPublishedTags.projectId, published.projectId));

      if (published.tags.length > 0) {
        await db.insert(projectPublishedTags).values(
          published.tags.map((tagId) => ({
            id: generateId(),
            projectId: published.projectId,
            tagId,
          })),
        );
      }

      return Result.succeed(undefined);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to save published data", error));
    }
  }
}
