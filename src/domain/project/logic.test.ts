import { Result } from "@praha/byethrow";
import { describe, expect, it } from "vitest";
import type { DraftWithTags, Project, SubmissionWithTags } from "./schema";
import type { ProjectId, SubmissionId, UserId } from "../shared/ids";
import {
  approveSubmission,
  canApprove,
  canReturn,
  canSubmit,
  canWithdraw,
  createPublishedFromSubmission,
  createSubmissionFromDraft,
  projectAfterApprove,
  projectAfterReturn,
  projectAfterSubmit,
  projectAfterWithdraw,
  returnSubmission,
  updateProject,
  withdrawSubmission,
} from "./logic";

// Test fixtures
const mockProjectId = "proj_123" as ProjectId;
const mockSubmissionId = "sub_123" as SubmissionId;
const mockUserId = "user_123" as UserId;
const mockEventId = "event_123" as any;
const mockOrgId = "org_123" as any;

const createMockProject = (overrides?: Partial<Project>): Project => ({
  id: mockProjectId,
  eventId: mockEventId,
  orgId: mockOrgId,
  name: "Test Project",
  placeText: null,
  logoKey: null,
  activeSubmissionId: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  ...overrides,
});

const createMockDraft = (overrides?: Partial<DraftWithTags>): DraftWithTags => ({
  projectId: mockProjectId,
  pamphletText: "Test pamphlet text",
  webContentJson: { type: "doc", content: [] },
  updatedAt: new Date("2025-01-01"),
  updatedBy: mockUserId,
  tags: [],
  ...overrides,
});

const createMockSubmission = (overrides?: Partial<SubmissionWithTags>): SubmissionWithTags => ({
  id: mockSubmissionId,
  projectId: mockProjectId,
  status: "submitted",
  pamphletText: "Test pamphlet text",
  webContentJson: { type: "doc", content: [] },
  submittedAt: new Date("2025-01-01"),
  submittedBy: mockUserId,
  decidedAt: null,
  decidedBy: null,
  tags: [],
  ...overrides,
});

describe("Project Domain Logic", () => {
  describe("Invariant Checks", () => {
    describe("canSubmit", () => {
      it("succeeds when no active submission", () => {
        const project = createMockProject({ activeSubmissionId: null });
        const result = canSubmit(project);

        expect(Result.isSuccess(result)).toBe(true);
      });

      it("fails when active submission exists", () => {
        const project = createMockProject({ activeSubmissionId: mockSubmissionId });
        const result = canSubmit(project);

        expect(Result.isFailure(result)).toBe(true);
        if (Result.isFailure(result)) {
          expect(result.error.code).toBe("ALREADY_SUBMITTED");
        }
      });
    });

    describe("canApprove", () => {
      it("succeeds when status is submitted", () => {
        const submission = createMockSubmission({ status: "submitted" });
        const result = canApprove(submission);

        expect(Result.isSuccess(result)).toBe(true);
      });

      it("fails when status is not submitted", () => {
        const statuses = ["returned", "approved", "withdrawn"] as const;

        for (const status of statuses) {
          const submission = createMockSubmission({ status });
          const result = canApprove(submission);

          expect(Result.isFailure(result)).toBe(true);
          if (Result.isFailure(result)) {
            expect(result.error.code).toBe("CANNOT_APPROVE");
          }
        }
      });
    });

    describe("canReturn", () => {
      it("succeeds when status is submitted", () => {
        const submission = createMockSubmission({ status: "submitted" });
        const result = canReturn(submission);

        expect(Result.isSuccess(result)).toBe(true);
      });

      it("fails when status is not submitted", () => {
        const statuses = ["returned", "approved", "withdrawn"] as const;

        for (const status of statuses) {
          const submission = createMockSubmission({ status });
          const result = canReturn(submission);

          expect(Result.isFailure(result)).toBe(true);
          if (Result.isFailure(result)) {
            expect(result.error.code).toBe("CANNOT_RETURN");
          }
        }
      });
    });

    describe("canWithdraw", () => {
      it("succeeds when status is submitted", () => {
        const submission = createMockSubmission({ status: "submitted" });
        const result = canWithdraw(submission);

        expect(Result.isSuccess(result)).toBe(true);
      });

      it("fails when status is not submitted", () => {
        const statuses = ["returned", "approved", "withdrawn"] as const;

        for (const status of statuses) {
          const submission = createMockSubmission({ status });
          const result = canWithdraw(submission);

          expect(Result.isFailure(result)).toBe(true);
          if (Result.isFailure(result)) {
            expect(result.error.code).toBe("CANNOT_WITHDRAW");
          }
        }
      });
    });
  });

  describe("State Transitions", () => {
    describe("createSubmissionFromDraft", () => {
      it("creates submission with correct data from draft", () => {
        const draft = createMockDraft({
          pamphletText: "Draft text",
          webContentJson: { type: "doc", content: [{ type: "paragraph" }] },
          tags: ["tag1" as any, "tag2" as any],
        });

        const submission = createSubmissionFromDraft(draft, mockUserId, mockSubmissionId);

        expect(submission.id).toBe(mockSubmissionId);
        expect(submission.projectId).toBe(draft.projectId);
        expect(submission.status).toBe("submitted");
        expect(submission.pamphletText).toBe(draft.pamphletText);
        expect(submission.webContentJson).toEqual(draft.webContentJson);
        expect(submission.submittedBy).toBe(mockUserId);
        expect(submission.tags).toEqual(draft.tags);
        expect(submission.decidedAt).toBeNull();
        expect(submission.decidedBy).toBeNull();
      });

      it("sets submittedAt to current time", () => {
        const draft = createMockDraft();
        const beforeTime = new Date();
        const submission = createSubmissionFromDraft(draft, mockUserId, mockSubmissionId);
        const afterTime = new Date();

        expect(submission.submittedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(submission.submittedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      });
    });

    describe("projectAfterSubmit", () => {
      it("sets activeSubmissionId", () => {
        const project = createMockProject({ activeSubmissionId: null });
        const updated = projectAfterSubmit(project, mockSubmissionId);

        expect(updated.activeSubmissionId).toBe(mockSubmissionId);
      });

      it("updates updatedAt timestamp", () => {
        const project = createMockProject();
        const beforeTime = new Date();
        const updated = projectAfterSubmit(project, mockSubmissionId);
        const afterTime = new Date();

        expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(updated.updatedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      });
    });

    describe("approveSubmission", () => {
      it("changes status to approved", () => {
        const submission = createMockSubmission({ status: "submitted" });
        const approved = approveSubmission(submission, mockUserId);

        expect(approved.status).toBe("approved");
        expect(approved.decidedBy).toBe(mockUserId);
        expect(approved.decidedAt).toBeInstanceOf(Date);
      });
    });

    describe("returnSubmission", () => {
      it("changes status to returned", () => {
        const submission = createMockSubmission({ status: "submitted" });
        const returned = returnSubmission(submission, mockUserId);

        expect(returned.status).toBe("returned");
        expect(returned.decidedBy).toBe(mockUserId);
        expect(returned.decidedAt).toBeInstanceOf(Date);
      });
    });

    describe("withdrawSubmission", () => {
      it("changes status to withdrawn", () => {
        const submission = createMockSubmission({ status: "submitted" });
        const withdrawn = withdrawSubmission(submission, mockUserId);

        expect(withdrawn.status).toBe("withdrawn");
        expect(withdrawn.decidedBy).toBe(mockUserId);
        expect(withdrawn.decidedAt).toBeInstanceOf(Date);
      });
    });

    describe("createPublishedFromSubmission", () => {
      it("creates published version with submission data", () => {
        const submission = createMockSubmission({
          pamphletText: "Approved text",
          webContentJson: { type: "doc", content: [] },
          tags: ["tag1" as any],
        });

        const published = createPublishedFromSubmission(submission, mockUserId);

        expect(published.projectId).toBe(submission.projectId);
        expect(published.pamphletText).toBe(submission.pamphletText);
        expect(published.webContentJson).toEqual(submission.webContentJson);
        expect(published.publishedBy).toBe(mockUserId);
        expect(published.tags).toEqual(submission.tags);
        expect(published.publishedAt).toBeInstanceOf(Date);
      });
    });

    describe("projectAfterApprove", () => {
      it("clears activeSubmissionId", () => {
        const project = createMockProject({ activeSubmissionId: mockSubmissionId });
        const updated = projectAfterApprove(project);

        expect(updated.activeSubmissionId).toBeNull();
      });
    });

    describe("projectAfterReturn", () => {
      it("clears activeSubmissionId", () => {
        const project = createMockProject({ activeSubmissionId: mockSubmissionId });
        const updated = projectAfterReturn(project);

        expect(updated.activeSubmissionId).toBeNull();
      });
    });

    describe("projectAfterWithdraw", () => {
      it("clears activeSubmissionId", () => {
        const project = createMockProject({ activeSubmissionId: mockSubmissionId });
        const updated = projectAfterWithdraw(project);

        expect(updated.activeSubmissionId).toBeNull();
      });
    });
  });

  describe("Project Updates", () => {
    describe("updateProject", () => {
      it("updates project name", () => {
        const project = createMockProject({ name: "Old Name" });
        const result = updateProject(project, { name: "New Name" });

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.name).toBe("New Name");
          expect(result.value.updatedAt).not.toEqual(project.updatedAt);
        }
      });

      it("updates project place text", () => {
        const project = createMockProject({ placeText: null });
        const result = updateProject(project, { placeText: "New Place" });

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.placeText).toBe("New Place");
        }
      });

      it("updates project logo key", () => {
        const project = createMockProject({ logoKey: null });
        const result = updateProject(project, { logoKey: "logos/test.png" });

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.logoKey).toBe("logos/test.png");
        }
      });

      it("updates multiple fields at once", () => {
        const project = createMockProject();
        const result = updateProject(project, {
          name: "New Name",
          placeText: "New Place",
          logoKey: "logos/new.png",
        });

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.name).toBe("New Name");
          expect(result.value.placeText).toBe("New Place");
          expect(result.value.logoKey).toBe("logos/new.png");
        }
      });

      it("fails when validation fails", () => {
        const project = createMockProject();
        const result = updateProject(project, { name: "" }); // Empty name should fail

        expect(Result.isFailure(result)).toBe(true);
        if (Result.isFailure(result)) {
          expect(result.error.code).toBe("VALIDATION_ERROR");
        }
      });
    });
  });
});
