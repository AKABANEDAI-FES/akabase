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
  submissionMessages,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import {
  draftWithTagsSchema,
  projectSchema,
  projectSubmissionSchema,
  publishedWithTagsSchema,
  submissionActionSchema,
  submissionWithTagsSchema,
} from "@/domain/project/schema";
import type {
  DraftWithTags,
  Project,
  ProjectSubmission,
  PublishedWithTags,
  SubmissionAction,
  SubmissionMessage,
  SubmissionWithTags,
} from "@/domain/project/schema";
import type { OrgId, ProjectId, SubmissionId, UserId } from "@/domain/shared/ids";
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

      // Update project's updatedAt
      const q2 = db
        .update(projects)
        .set({ updatedAt: draft.updatedAt })
        .where(eq(projects.id, draft.projectId));

      // Replace tags (delete + insert)
      const q3 = db.delete(projectDraftTags).where(eq(projectDraftTags.projectId, draft.projectId));

      const query: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [q1, q2, q3];

      if (draft.tags.length > 0) {
        const q4 = db.insert(projectDraftTags).values(
          draft.tags.map((tagId) => ({
            id: generateId(),
            projectId: draft.projectId,
            tagId,
          })),
        );
        query.push(q4);
      }

      await db.batch(query);
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to save draft", error);
    }
  }

  async savePublished(published: PublishedWithTags): Promise<void> {
    try {
      // Upsert published
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
            // Immutable fields excluded: projectId
            pamphletText: published.pamphletText,
            webContentJson: published.webContentJson,
            publishedAt: published.publishedAt,
            publishedBy: published.publishedBy,
          },
        });

      // Update project's updatedAt
      const q2 = db
        .update(projects)
        .set({ updatedAt: published.publishedAt })
        .where(eq(projects.id, published.projectId));

      // Replace tags (delete + insert)
      const q3 = db
        .delete(projectPublishedTags)
        .where(eq(projectPublishedTags.projectId, published.projectId));

      const query: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [q1, q2, q3];

      if (published.tags.length > 0) {
        const q4 = db.insert(projectPublishedTags).values(
          published.tags.map((tagId) => ({
            id: generateId(),
            projectId: published.projectId,
            tagId,
          })),
        );
        query.push(q4);
      }

      await db.batch(query);
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to save published data", error);
    }
  }

  async findApprovalAction(
    submissionId: SubmissionId,
    userId: UserId,
  ): Promise<SubmissionAction | null> {
    try {
      const row = await db.query.submissionActions.findFirst({
        where: (submissionActions, { eq, and }) =>
          and(
            eq(submissionActions.submissionId, submissionId),
            eq(submissionActions.actionType, "approved"),
            eq(submissionActions.userId, userId),
          ),
      });

      if (!row) {
        return null;
      }

      const action = submissionActionSchema.parse({
        id: row.id,
        submissionId: row.submissionId,
        actionType: row.actionType,
        userId: row.userId,
        createdAt: new Date(row.createdAt),
      });

      return action;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to find approval action", error);
    }
  }

  async countApprovalActions(submissionId: SubmissionId): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(submissionActions)
        .where(
          and(
            eq(submissionActions.submissionId, submissionId),
            eq(submissionActions.actionType, "approved"),
          ),
        );

      return result[0]?.count ?? 0;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to count approval actions", error);
    }
  }

  async approveWithTransaction(params: {
    approvalAction: SubmissionAction;
    approvalMessage?: SubmissionMessage;
    submission: SubmissionWithTags;
    published: PublishedWithTags;
  }): Promise<void> {
    try {
      // Build batch operations
      const query: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [
        // 1. Save approval action
        db.insert(submissionActions).values({
          id: params.approvalAction.id,
          submissionId: params.approvalAction.submissionId,
          actionType: params.approvalAction.actionType,
          userId: params.approvalAction.userId,
          createdAt: params.approvalAction.createdAt,
        }),
      ];

      // 2. Save optional approval message
      if (params.approvalMessage) {
        query.push(
          db.insert(submissionMessages).values({
            id: params.approvalMessage.id,
            submissionId: params.approvalMessage.submissionId,
            actionId: params.approvalMessage.actionId,
            userId: params.approvalMessage.userId,
            message: params.approvalMessage.message,
            createdAt: params.approvalMessage.createdAt,
          }),
        );
      }

      // 3. Always update submission status to 'approved'
      query.push(
        db
          .update(projectSubmissions)
          .set({ status: "approved" })
          .where(eq(projectSubmissions.id, params.submission.id)),
      );

      // 4. Update project updatedAt
      query.push(
        db
          .update(projects)
          .set({ updatedAt: new Date() })
          .where(eq(projects.id, params.submission.projectId)),
      );

      // 5. Always save published data (UPSERT)
      const published = params.published;
      query.push(
        db
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
          }),
      );

      // 6. Delete and re-insert published tags
      query.push(
        db
          .delete(projectPublishedTags)
          .where(eq(projectPublishedTags.projectId, published.projectId)),
      );

      if (published.tags.length > 0) {
        query.push(
          db.insert(projectPublishedTags).values(
            published.tags.map((tagId) => ({
              id: generateId(),
              projectId: published.projectId,
              tagId,
            })),
          ),
        );
      }

      // Execute all operations atomically
      await db.batch(query);
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to approve with transaction", error);
    }
  }

  async returnWithTransaction(params: {
    updatedSubmission: SubmissionWithTags;
    returnAction: SubmissionAction;
    returnMessage: SubmissionMessage;
  }): Promise<void> {
    try {
      // Build batch operations
      await db.batch([
        // 1. Update submission status
        db
          .update(projectSubmissions)
          .set({ status: params.updatedSubmission.status })
          .where(eq(projectSubmissions.id, params.updatedSubmission.id)),

        // 2. Update project's updatedAt
        db
          .update(projects)
          .set({ updatedAt: new Date() })
          .where(eq(projects.id, params.updatedSubmission.projectId)),

        // 3. Save return action
        db.insert(submissionActions).values({
          id: params.returnAction.id,
          submissionId: params.returnAction.submissionId,
          actionType: params.returnAction.actionType,
          userId: params.returnAction.userId,
          createdAt: params.returnAction.createdAt,
        }),

        // 4. Save return message
        db.insert(submissionMessages).values({
          id: params.returnMessage.id,
          submissionId: params.returnMessage.submissionId,
          actionId: params.returnMessage.actionId,
          userId: params.returnMessage.userId,
          message: params.returnMessage.message,
          createdAt: params.returnMessage.createdAt,
        }),
      ]);
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to return with transaction", error);
    }
  }

  async withdrawWithTransaction(params: {
    updatedSubmission: SubmissionWithTags;
    withdrawalAction: SubmissionAction;
    withdrawalMessage?: SubmissionMessage;
  }): Promise<void> {
    try {
      // Build batch operations
      const query: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [
        // 1. Update submission status
        db
          .update(projectSubmissions)
          .set({ status: params.updatedSubmission.status })
          .where(eq(projectSubmissions.id, params.updatedSubmission.id)),

        // 2. Update project's updatedAt
        db
          .update(projects)
          .set({ updatedAt: new Date() })
          .where(eq(projects.id, params.updatedSubmission.projectId)),

        // 3. Save withdrawal action
        db.insert(submissionActions).values({
          id: params.withdrawalAction.id,
          submissionId: params.withdrawalAction.submissionId,
          actionType: params.withdrawalAction.actionType,
          userId: params.withdrawalAction.userId,
          createdAt: params.withdrawalAction.createdAt,
        }),
      ];

      // 4. Optionally save withdrawal message
      if (params.withdrawalMessage) {
        query.push(
          db.insert(submissionMessages).values({
            id: params.withdrawalMessage.id,
            submissionId: params.withdrawalMessage.submissionId,
            actionId: params.withdrawalMessage.actionId,
            userId: params.withdrawalMessage.userId,
            message: params.withdrawalMessage.message,
            createdAt: params.withdrawalMessage.createdAt,
          }),
        );
      }

      await db.batch(query);
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to withdraw with transaction", error);
    }
  }

  async submitWithTransaction(params: {
    submission: SubmissionWithTags;
    submissionAction: SubmissionAction;
    submissionMessage?: SubmissionMessage;
  }): Promise<void> {
    try {
      // Build batch operations
      const query: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [
        // 1. Insert submission
        db.insert(projectSubmissions).values({
          id: params.submission.id,
          projectId: params.submission.projectId,
          status: params.submission.status,
          pamphletText: params.submission.pamphletText,
          webContentJson: params.submission.webContentJson,
          submittedAt: params.submission.submittedAt,
          submittedBy: params.submission.submittedBy,
        }),

        // 2. Update project's updatedAt
        db
          .update(projects)
          .set({ updatedAt: params.submission.submittedAt })
          .where(eq(projects.id, params.submission.projectId)),

        // 3. Save submission action
        db.insert(submissionActions).values({
          id: params.submissionAction.id,
          submissionId: params.submissionAction.submissionId,
          actionType: params.submissionAction.actionType,
          userId: params.submissionAction.userId,
          createdAt: params.submissionAction.createdAt,
        }),
      ];

      // 4. Insert submission tags
      if (params.submission.tags.length > 0) {
        query.push(
          db.insert(projectSubmissionTags).values(
            params.submission.tags.map((tagId) => ({
              id: generateId(),
              submissionId: params.submission.id,
              tagId,
            })),
          ),
        );
      }

      // 5. Save optional message
      if (params.submissionMessage) {
        query.push(
          db.insert(submissionMessages).values({
            id: params.submissionMessage.id,
            submissionId: params.submissionMessage.submissionId,
            actionId: params.submissionMessage.actionId,
            userId: params.submissionMessage.userId,
            message: params.submissionMessage.message,
            createdAt: params.submissionMessage.createdAt,
          }),
        );
      }

      // Execute all operations atomically
      await db.batch(query);
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to submit with transaction", error);
    }
  }
}
