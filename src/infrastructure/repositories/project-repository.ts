import { db } from "@/db";
import {
  projectDraftTags,
  projectDrafts,
  projectPublished,
  projectPublishedTags,
  projectSubmissionTags,
  projectSubmissions,
  projects,
  submissionActions,
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
  SubmissionAction,
  SubmissionWithTags,
} from "@/domain/project/schema";
import type { OrgId, ProjectId, SubmissionId } from "@/domain/shared/ids";
import type { ProjectRepository } from "@/domain/project/repository";
import { RepositoryException } from "@/domain/shared/repository";
import { generateId } from "@/libs/id";
import type { BatchItem } from "drizzle-orm/batch";

/**
 * Project Repository Implementation using Drizzle ORM
 */
export class ProjectRepositoryImpl implements ProjectRepository {
  async findById(id: ProjectId): Promise<Project | null> {
    try {
      const row = await db.query.projects.findFirst({
        where: (projects, { eq }) => eq(projects.id, id),
      });

      if (!row) {
        return null;
      }

      const project = projectSchema.parse({
        id: row.id,
        eventId: row.eventId,
        orgId: row.orgId,
        name: row.name,
        placeId: row.placeId,
        logoKey: row.logoKey,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      });

      return project;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to find project", error);
    }
  }

  async findDraftWithTags(projectId: ProjectId): Promise<DraftWithTags | null> {
    try {
      const draftRow = await db.query.projectDrafts.findFirst({
        where: (projectDrafts, { eq }) => eq(projectDrafts.projectId, projectId),
        with: {
          tags: {
            columns: {
              tagId: true,
            },
          },
        },
      });

      if (!draftRow) {
        return null;
      }

      const draft = draftWithTagsSchema.parse({
        projectId: draftRow.projectId,
        pamphletText: draftRow.pamphletText,
        webContentJson: draftRow.webContentJson,
        updatedAt: new Date(draftRow.updatedAt),
        updatedBy: draftRow.updatedBy,
        tags: draftRow.tags.map((t) => t.tagId),
      });

      return draft;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to find draft", error);
    }
  }

  async findSubmissionById(id: SubmissionId): Promise<SubmissionWithTags | null> {
    try {
      const row = await db.query.projectSubmissions.findFirst({
        where: (projectSubmissions, { eq }) => eq(projectSubmissions.id, id),
        with: {
          tags: {
            columns: {
              tagId: true,
            },
          },
        },
      });

      if (!row) {
        return null;
      }

      const submission = submissionWithTagsSchema.parse({
        id: row.id,
        projectId: row.projectId,
        status: row.status,
        pamphletText: row.pamphletText,
        webContentJson: row.webContentJson,
        submittedAt: new Date(row.submittedAt),
        submittedBy: row.submittedBy,
        tags: row.tags.map((t) => t.tagId),
      });

      return submission;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to find submission", error);
    }
  }

  async findPublishedByProjectId(projectId: ProjectId): Promise<PublishedWithTags | null> {
    try {
      const row = await db.query.projectPublished.findFirst({
        where: (projectPublished, { eq }) => eq(projectPublished.projectId, projectId),
        with: {
          tags: {
            columns: {
              tagId: true,
            },
          },
        },
      });

      if (!row) {
        return null;
      }

      const published = publishedWithTagsSchema.parse({
        projectId: row.projectId,
        pamphletText: row.pamphletText,
        webContentJson: row.webContentJson,
        publishedAt: new Date(row.publishedAt),
        publishedBy: row.publishedBy,
        tags: row.tags.map((t) => t.tagId),
      });

      return published;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to find published data", error);
    }
  }

  async listByOrganization(orgId: OrgId): Promise<Project[]> {
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
          placeId: row.placeId,
          logoKey: row.logoKey,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        }),
      );

      return projectList;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to list projects", error);
    }
  }

  async listSubmissionsByProject(projectId: ProjectId): Promise<ProjectSubmission[]> {
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
        }),
      );

      return submissions;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to list submissions", error);
    }
  }

  async saveProject(project: Project): Promise<void> {
    try {
      // Upsert project
      await db
        .insert(projects)
        .values({
          id: project.id,
          eventId: project.eventId,
          orgId: project.orgId,
          name: project.name,
          placeId: project.placeId,
          logoKey: project.logoKey,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        })
        .onConflictDoUpdate({
          target: projects.id,
          set: {
            // Immutable fields excluded: id, eventId, orgId, createdAt
            name: project.name,
            placeId: project.placeId,
            logoKey: project.logoKey,
            updatedAt: project.updatedAt,
          },
          where: eq(projects.eventId, project.eventId),
        });
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to save project", error);
    }
  }

  async saveDraft(draft: DraftWithTags): Promise<void> {
    try {
      // Upsert draft
      const q1 = db
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
      const q2 = db.delete(projectDraftTags).where(eq(projectDraftTags.projectId, draft.projectId));

      const query: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [q1, q2];

      if (draft.tags.length > 0) {
        const q3 = db.insert(projectDraftTags).values(
          draft.tags.map((tagId) => ({
            id: generateId(),
            projectId: draft.projectId,
            tagId,
          })),
        );
        query.push(q3);
      }

      await db.batch(query);
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to save draft", error);
    }
  }

  async saveSubmission(submission: SubmissionWithTags): Promise<void> {
    try {
      // Upsert submission
      const q1 = db
        .insert(projectSubmissions)
        .values({
          id: submission.id,
          projectId: submission.projectId,
          status: submission.status,
          pamphletText: submission.pamphletText,
          webContentJson: submission.webContentJson,
          submittedAt: submission.submittedAt,
          submittedBy: submission.submittedBy,
        })
        .onConflictDoUpdate({
          target: projectSubmissions.id,
          set: {
            // Submission content is immutable, only status can change
            status: submission.status,
            // Immutable fields excluded: id, projectId, pamphletText, webContentJson, submittedAt, submittedBy
          },
        });

      // Replace tags (delete + insert)
      const q2 = db
        .delete(projectSubmissionTags)
        .where(eq(projectSubmissionTags.submissionId, submission.id));

      const query: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [q1, q2];

      if (submission.tags.length > 0) {
        const q3 = db.insert(projectSubmissionTags).values(
          submission.tags.map((tagId) => ({
            id: generateId(),
            submissionId: submission.id,
            tagId,
          })),
        );
        query.push(q3);
      }

      await db.batch(query);
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to save submission", error);
    }
  }

  async savePublished(published: PublishedWithTags): Promise<void> {
    try {
      // Upsert published data
      const q1 = db
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

      // Replace tags (delete + insert)
      const q2 = db
        .delete(projectPublishedTags)
        .where(eq(projectPublishedTags.projectId, published.projectId));

      const query: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [q1, q2];

      if (published.tags.length > 0) {
        const q3 = db.insert(projectPublishedTags).values(
          published.tags.map((tagId) => ({
            id: generateId(),
            projectId: published.projectId,
            tagId,
          })),
        );
        query.push(q3);
      }

      await db.batch(query);
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to save published data", error);
    }
  }

  async saveSubmissionAction(action: SubmissionAction): Promise<void> {
    try {
      await db.insert(submissionActions).values({
        id: action.id,
        submissionId: action.submissionId,
        actionType: action.actionType,
        userId: action.userId,
        createdAt: action.createdAt,
      });
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to save submission action", error);
    }
  }
}
