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
        saveSubmission: vi.fn().mockResolvedValue(Result.succeed(undefined)),
        saveProject: vi.fn().mockResolvedValue(Result.succeed(undefined)),
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
    expect(mockDeps.projectRepo.saveSubmission).toHaveBeenCalled();
    expect(mockDeps.projectRepo.saveProject).toHaveBeenCalled();
  });

  it("should fail when project not found", async () => {
    // Arrange
    const mockDeps: Pick<Dependencies, "projectRepo"> = {
      projectRepo: {
        findById: vi.fn().mockResolvedValue(Result.succeed(null)),
        findDraftWithTags: vi.fn(),
        saveSubmission: vi.fn(),
        saveProject: vi.fn(),
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
        saveSubmission: vi.fn(),
        saveProject: vi.fn(),
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
        saveSubmission: vi.fn(),
        saveProject: vi.fn(),
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
    expect(mockDeps.projectRepo.saveSubmission).not.toHaveBeenCalled();
    expect(mockDeps.projectRepo.saveProject).not.toHaveBeenCalled();
  });

  it("should fail when repository operation fails", async () => {
    // Arrange
    const mockDeps: Pick<Dependencies, "projectRepo"> = {
      projectRepo: {
        findById: vi.fn().mockResolvedValue(Result.succeed(mockProject)),
        findDraftWithTags: vi.fn().mockResolvedValue(Result.succeed(mockDraft)),
        saveSubmission: vi
          .fn()
          .mockResolvedValue(Result.fail({ code: "DATABASE_ERROR", message: "DB error" })),
        saveProject: vi.fn(),
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
    expect(mockDeps.projectRepo.saveProject).not.toHaveBeenCalled();
  });

  it("should set activeSubmissionId on the project", async () => {
    // Arrange
    const mockDeps: Pick<Dependencies, "projectRepo"> = {
      projectRepo: {
        findById: vi.fn().mockResolvedValue(Result.succeed(mockProject)),
        findDraftWithTags: vi.fn().mockResolvedValue(Result.succeed(mockDraft)),
        saveSubmission: vi.fn().mockResolvedValue(Result.succeed(undefined)),
        saveProject: vi.fn().mockResolvedValue(Result.succeed(undefined)),
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
    const saveCall = (mockDeps.projectRepo.saveProject as any).mock.calls[0];
    const updatedProject = saveCall[0];
    expect(updatedProject.activeSubmissionId).toBeDefined();
    expect(updatedProject.activeSubmissionId).not.toBeNull();
  });
});
