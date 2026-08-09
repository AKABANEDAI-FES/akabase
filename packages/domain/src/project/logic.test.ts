import { Result } from "@akabase/result";
import { describe, expect, it } from "vite-plus/test";
import type { DraftWithTags, ProjectId } from "./schema";
import type { UserId } from "../user/schema";
import { cast } from "../shared/ids";
import {
  updateProjectDraftEntity,
  updatePublishedEntity,
  validateDraftForSubmission,
} from "./logic";

// Test fixtures
const mockProjectId = cast<ProjectId>("project-123");
const mockUserId = cast<UserId>("user-123");

const createMockDraft = (overrides?: Partial<DraftWithTags>): DraftWithTags => ({
  projectId: mockProjectId,
  pamphletText: "テスト用の説明文",
  webContentJson: null,
  openingHours: "10:00-18:00",
  lastEntryTime: "17:30",
  updatedAt: new Date("2025-01-01"),
  updatedBy: mockUserId,
  tags: [],
  ...overrides,
});

describe("Project Domain Logic", () => {
  describe("updateProjectDraftEntity", () => {
    it("succeeds when pamphletText is within the max length", () => {
      const result = updateProjectDraftEntity({
        projectId: mockProjectId,
        pamphletText: "あ".repeat(10),
        pamphletTextMaxLength: 10,
        webContentJson: null,
        openingHours: "",
        lastEntryTime: "",
        tags: [],
        updatedBy: mockUserId,
      });

      expect(Result.isSuccess(result)).toBe(true);
    });

    it("fails when pamphletText exceeds the max length", () => {
      const result = updateProjectDraftEntity({
        projectId: mockProjectId,
        pamphletText: "あ".repeat(11),
        pamphletTextMaxLength: 10,
        webContentJson: null,
        openingHours: "",
        lastEntryTime: "",
        tags: [],
        updatedBy: mockUserId,
      });

      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.message).toBe("パンフレットテキストは10文字以内で入力してください");
      }
    });
  });

  describe("updatePublishedEntity", () => {
    it("validates pamphletText length after trimming", () => {
      const result = updatePublishedEntity({
        projectId: mockProjectId,
        pamphletText: `  ${"あ".repeat(10)}  `,
        pamphletTextMaxLength: 10,
        webContentJson: null,
        openingHours: "10:00-18:00",
        lastEntryTime: "17:30",
        tags: [],
        publishedBy: mockUserId,
      });

      expect(Result.isSuccess(result)).toBe(true);
    });

    it("fails when pamphletText exceeds the max length", () => {
      const result = updatePublishedEntity({
        projectId: mockProjectId,
        pamphletText: "あ".repeat(11),
        pamphletTextMaxLength: 10,
        webContentJson: null,
        openingHours: "10:00-18:00",
        lastEntryTime: "17:30",
        tags: [],
        publishedBy: mockUserId,
      });

      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.message).toBe("パンフレットテキストは10文字以内で入力してください");
      }
    });
  });

  describe("validateDraftForSubmission", () => {
    it("succeeds when required fields are filled and pamphletText is within the max length", () => {
      const draft = createMockDraft({ pamphletText: "あ".repeat(10) });
      const result = validateDraftForSubmission(draft, 10);

      expect(Result.isSuccess(result)).toBe(true);
    });

    it("fails when pamphletText exceeds the max length", () => {
      const draft = createMockDraft({ pamphletText: "あ".repeat(11) });
      const result = validateDraftForSubmission(draft, 10);

      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.message).toBe("パンフレットテキストは10文字以内で入力してください");
      }
    });

    it("fails when required fields are missing", () => {
      const draft = createMockDraft({ openingHours: "", lastEntryTime: "" });
      const result = validateDraftForSubmission(draft, 68);

      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.error.message).toBe("開催時間、最終受付時間を入力してから提出してください");
      }
    });
  });
});
