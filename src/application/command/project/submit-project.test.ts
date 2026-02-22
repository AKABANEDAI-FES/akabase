import { Result } from "@praha/byethrow";
import { describe, expect, it, vi } from "vitest";
import type { Dependencies } from "@/infrastructure/di";
import type { DraftWithTags, Project } from "@/domain/project/schema";
import type { ProjectId, SubmissionId, UserId } from "@/domain/shared/ids";
import { submitProject } from "./submit-project";

// Test fixtures
const mockProjectId = "proj_123" as ProjectId;
const mockUserId = "user_123" as UserId;

const mockProject: Project = {
  id: mockProjectId,
  eventId: "event_123" as any,
  orgId: "org_123" as any,
  name: "Test Project",
  placeText: null,
  logoKey: null,
  activeSubmissionId: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

const mockDraft: DraftWithTags = {
  projectId: mockProjectId,
  pamphletText: "Test pamphlet",
  webContentJson: { type: "doc", content: [] },
  updatedAt: new Date("2025-01-01"),
  updatedBy: mockUserId,
  tags: [],
};

describe("submitProject", () => {
  it("should successfully submit project", async () => {
    // Arrange
    const mockDeps: Pick<Dependencies, "projectRepo"> = {
      projectRepo: {
        findById: vi.fn().mockResolvedValue(Result.succeed(mockProject)),
        findDraftWithTags: vi.fn().mockResolvedValue(Result.succeed(mockDraft)),
        saveSubmissionWithTags: vi.fn().mockResolvedValue(Result.succeed(undefined)),
        updateProject: vi.fn().mockResolvedValue(Result.succeed(undefined)),
      } as any,
    };

    // Act
    const result = await submitProject(mockDeps, {
      projectId: mockProjectId,
      userId: mockUserId,
    });

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.submissionId).toBeDefined();
    }

    expect(mockDeps.projectRepo.findById).toHaveBeenCalledWith(mockProjectId);
    expect(mockDeps.projectRepo.findDraftWithTags).toHaveBeenCalledWith(mockProjectId);
    expect(mockDeps.projectRepo.saveSubmissionWithTags).toHaveBeenCalled();
    expect(mockDeps.projectRepo.updateProject).toHaveBeenCalled();
  });

  it("should fail when project not found", async () => {
    // Arrange
    const mockDeps: Pick<Dependencies, "projectRepo"> = {
      projectRepo: {
        findById: vi.fn().mockResolvedValue(Result.succeed(null)),
        findDraftWithTags: vi.fn(),
        saveSubmissionWithTags: vi.fn(),
        updateProject: vi.fn(),
      } as any,
    };

    // Act
    const result = await submitProject(mockDeps, {
      projectId: mockProjectId,
      userId: mockUserId,
    });

    // Assert
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PROJECT_NOT_FOUND");
    }
  });

  it("should fail when draft not found", async () => {
    // Arrange
    const mockDeps: Pick<Dependencies, "projectRepo"> = {
      projectRepo: {
        findById: vi.fn().mockResolvedValue(Result.succeed(mockProject)),
        findDraftWithTags: vi.fn().mockResolvedValue(Result.succeed(null)),
        saveSubmissionWithTags: vi.fn(),
        updateProject: vi.fn(),
      } as any,
    };

    // Act
    const result = await submitProject(mockDeps, {
      projectId: mockProjectId,
      userId: mockUserId,
    });

    // Assert
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("DRAFT_NOT_FOUND");
    }
  });

  it("should fail when project already has active submission", async () => {
    // Arrange
    const projectWithActiveSubmission: Project = {
      ...mockProject,
      activeSubmissionId: "existing_sub" as SubmissionId,
    };

    const mockDeps: Pick<Dependencies, "projectRepo"> = {
      projectRepo: {
        findById: vi.fn().mockResolvedValue(Result.succeed(projectWithActiveSubmission)),
        findDraftWithTags: vi.fn().mockResolvedValue(Result.succeed(mockDraft)),
        saveSubmissionWithTags: vi.fn(),
        updateProject: vi.fn(),
      } as any,
    };

    // Act
    const result = await submitProject(mockDeps, {
      projectId: mockProjectId,
      userId: mockUserId,
    });

    // Assert
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("ALREADY_SUBMITTED");
    }

    // Should not call persistence methods
    expect(mockDeps.projectRepo.saveSubmissionWithTags).not.toHaveBeenCalled();
    expect(mockDeps.projectRepo.updateProject).not.toHaveBeenCalled();
  });

  it("should fail when repository operation fails", async () => {
    // Arrange
    const mockDeps: Pick<Dependencies, "projectRepo"> = {
      projectRepo: {
        findById: vi.fn().mockResolvedValue(Result.succeed(mockProject)),
        findDraftWithTags: vi.fn().mockResolvedValue(Result.succeed(mockDraft)),
        saveSubmissionWithTags: vi
          .fn()
          .mockResolvedValue(Result.fail({ code: "DATABASE_ERROR", message: "DB error" })),
        updateProject: vi.fn(),
      } as any,
    };

    // Act
    const result = await submitProject(mockDeps, {
      projectId: mockProjectId,
      userId: mockUserId,
    });

    // Assert
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("DATABASE_ERROR");
    }

    // Should not proceed to update project
    expect(mockDeps.projectRepo.updateProject).not.toHaveBeenCalled();
  });

  it("should set activeSubmissionId on the project", async () => {
    // Arrange
    const mockDeps: Pick<Dependencies, "projectRepo"> = {
      projectRepo: {
        findById: vi.fn().mockResolvedValue(Result.succeed(mockProject)),
        findDraftWithTags: vi.fn().mockResolvedValue(Result.succeed(mockDraft)),
        saveSubmissionWithTags: vi.fn().mockResolvedValue(Result.succeed(undefined)),
        updateProject: vi.fn().mockResolvedValue(Result.succeed(undefined)),
      } as any,
    };

    // Act
    const result = await submitProject(mockDeps, {
      projectId: mockProjectId,
      userId: mockUserId,
    });

    // Assert
    expect(Result.isSuccess(result)).toBe(true);

    // Verify the updated project has activeSubmissionId set
    const updateCall = (mockDeps.projectRepo.updateProject as any).mock.calls[0];
    const updatedProject = updateCall[0];
    expect(updatedProject.activeSubmissionId).toBeDefined();
    expect(updatedProject.activeSubmissionId).not.toBeNull();
  });
});
