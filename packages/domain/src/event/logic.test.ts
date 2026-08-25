import { Result } from "@akabase/result";
import { describe, expect, it } from "vite-plus/test";
import type { Event, EventId, ProjectCategory, ProjectCategoryId } from "./schema";
import { PROJECT_CATEGORY_NAME_MAX_LENGTH } from "./schema";
import { cast } from "../shared/ids";
import {
  activateEvent,
  archiveEvent,
  canModifyEvent,
  createEventEntity,
  createEventSettingsEntity,
  createProjectCategoryEntity,
  updateEventEntity,
  updateEventSettingsEntity,
  updateProjectCategoryEntity,
} from "./logic";

// Test fixtures
const mockEventId = cast<EventId>("event-123");
const mockProjectCategoryId = cast<ProjectCategoryId>("project-category-123");

const createMockEvent = (overrides?: Partial<Event>): Event => ({
  id: mockEventId,
  name: "Test Event",
  slug: "2025",
  status: "active",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  ...overrides,
});

const createMockProjectCategory = (overrides?: Partial<ProjectCategory>): ProjectCategory => ({
  id: mockProjectCategoryId,
  eventId: mockEventId,
  name: "WELLB教室企画",
  displayOrder: 0,
  createdAt: new Date("2025-01-01"),
  ...overrides,
});

describe("Event Domain Logic", () => {
  describe("Invariant Checks", () => {
    describe("canModifyEvent", () => {
      it("succeeds when event is active", () => {
        const event = createMockEvent({ status: "active" });
        const result = canModifyEvent(event);

        expect(Result.isSuccess(result)).toBe(true);
      });

      it("fails when event is archived", () => {
        const event = createMockEvent({ status: "archived" });
        const result = canModifyEvent(event);

        expect(Result.isFailure(result)).toBe(true);
        if (Result.isFailure(result)) {
          expect(result.error.code).toBe("EVENT_ARCHIVED");
        }
      });
    });
  });

  describe("Event Updates", () => {
    describe("createEventEntity", () => {
      it("creates active event with same createdAt and updatedAt", () => {
        const now = new Date("2025-02-01T10:00:00.000Z");
        const result = createEventEntity({
          id: mockEventId,
          name: "Created Event",
          slug: "created-event",
          now,
        });

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.id).toBe(mockEventId);
          expect(result.value.name).toBe("Created Event");
          expect(result.value.slug).toBe("created-event");
          expect(result.value.status).toBe("active");
          expect(result.value.createdAt).toBe(now);
          expect(result.value.updatedAt).toBe(now);
        }
      });
    });

    describe("updateEventEntity", () => {
      it("updates name/slug and updatedAt while keeping other fields", () => {
        const event = createMockEvent({
          name: "Old Name",
          slug: "old-slug",
          createdAt: new Date("2025-01-01T00:00:00.000Z"),
          updatedAt: new Date("2025-01-02T00:00:00.000Z"),
        });
        const now = new Date("2025-02-01T10:00:00.000Z");

        const result = updateEventEntity(event, {
          name: "New Name",
          slug: "new-slug",
          now,
        });

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.id).toBe(event.id);
          expect(result.value.status).toBe(event.status);
          expect(result.value.createdAt).toBe(event.createdAt);
          expect(result.value.name).toBe("New Name");
          expect(result.value.slug).toBe("new-slug");
          expect(result.value.updatedAt).toBe(now);
        }
      });
    });

    describe("archiveEvent", () => {
      it("changes event status to archived", () => {
        const event = createMockEvent({ status: "active" });
        const now = new Date("2025-02-01T10:00:00.000Z");
        const result = archiveEvent(event, now);

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.status).toBe("archived");
          expect(result.value.updatedAt).toBe(now);
        }
      });
    });

    describe("activateEvent", () => {
      it("changes event status to active", () => {
        const event = createMockEvent({ status: "archived" });
        const now = new Date("2025-02-01T10:00:00.000Z");
        const result = activateEvent(event, now);

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.status).toBe("active");
          expect(result.value.updatedAt).toBe(now);
        }
      });
    });
  });

  describe("Event Settings", () => {
    describe("createEventSettingsEntity", () => {
      it("creates settings with same createdAt and updatedAt", () => {
        const now = new Date("2025-02-01T10:00:00.000Z");
        const result = createEventSettingsEntity({
          eventId: mockEventId,
          webContentDescription: "紹介文、注意事項の順に記載してください",
          pamphletTextMaxLength: 68,
          now,
        });

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.eventId).toBe(mockEventId);
          expect(result.value.webContentDescription).toBe("紹介文、注意事項の順に記載してください");
          expect(result.value.createdAt).toBe(now);
          expect(result.value.updatedAt).toBe(now);
        }
      });

      it("normalizes whitespace-only description to null", () => {
        const result = createEventSettingsEntity({
          eventId: mockEventId,
          webContentDescription: "  \n  ",
          pamphletTextMaxLength: null,
        });

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.webContentDescription).toBeNull();
        }
      });
    });

    describe("updateEventSettingsEntity", () => {
      it("updates description and updatedAt while keeping createdAt", () => {
        const createdAt = new Date("2025-01-01T00:00:00.000Z");
        const settings = {
          eventId: mockEventId,
          webContentDescription: "旧説明",
          pamphletTextMaxLength: null,
          createdAt,
          updatedAt: createdAt,
        };
        const now = new Date("2025-02-01T10:00:00.000Z");

        const result = updateEventSettingsEntity(settings, {
          webContentDescription: "新説明",
          pamphletTextMaxLength: 100,
          now,
        });

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.eventId).toBe(mockEventId);
          expect(result.value.webContentDescription).toBe("新説明");
          expect(result.value.pamphletTextMaxLength).toBe(100);
          expect(result.value.createdAt).toBe(createdAt);
          expect(result.value.updatedAt).toBe(now);
        }
      });
    });
  });

  describe("Project Category Management", () => {
    describe("createProjectCategoryEntity", () => {
      it("creates project category with given displayOrder", () => {
        const now = new Date("2025-02-01T10:00:00.000Z");
        const result = createProjectCategoryEntity({
          id: mockProjectCategoryId,
          eventId: mockEventId,
          name: "WELLB模擬店",
          displayOrder: 3,
          now,
        });

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.id).toBe(mockProjectCategoryId);
          expect(result.value.eventId).toBe(mockEventId);
          expect(result.value.name).toBe("WELLB模擬店");
          expect(result.value.displayOrder).toBe(3);
          expect(result.value.createdAt).toBe(now);
        }
      });

      it("trims surrounding whitespace from name", () => {
        const result = createProjectCategoryEntity({
          id: mockProjectCategoryId,
          eventId: mockEventId,
          name: "  WELLB模擬店  ",
          displayOrder: 0,
        });

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.name).toBe("WELLB模擬店");
        }
      });

      it("fails when name is empty", () => {
        const result = createProjectCategoryEntity({
          id: mockProjectCategoryId,
          eventId: mockEventId,
          name: "",
          displayOrder: 0,
        });

        expect(Result.isFailure(result)).toBe(true);
        if (Result.isFailure(result)) {
          expect(result.error.code).toBe("VALIDATION_ERROR");
        }
      });

      it("fails when name is whitespace only", () => {
        const result = createProjectCategoryEntity({
          id: mockProjectCategoryId,
          eventId: mockEventId,
          name: "   ",
          displayOrder: 0,
        });

        expect(Result.isFailure(result)).toBe(true);
        if (Result.isFailure(result)) {
          expect(result.error.code).toBe("VALIDATION_ERROR");
        }
      });

      it("fails when name exceeds the max length", () => {
        const result = createProjectCategoryEntity({
          id: mockProjectCategoryId,
          eventId: mockEventId,
          name: "あ".repeat(PROJECT_CATEGORY_NAME_MAX_LENGTH + 1),
          displayOrder: 0,
        });

        expect(Result.isFailure(result)).toBe(true);
        if (Result.isFailure(result)) {
          expect(result.error.code).toBe("VALIDATION_ERROR");
        }
      });

      it("succeeds for exactly the max length", () => {
        const result = createProjectCategoryEntity({
          id: mockProjectCategoryId,
          eventId: mockEventId,
          name: "あ".repeat(PROJECT_CATEGORY_NAME_MAX_LENGTH),
          displayOrder: 0,
        });

        expect(Result.isSuccess(result)).toBe(true);
      });

      it("fails when displayOrder is negative", () => {
        const result = createProjectCategoryEntity({
          id: mockProjectCategoryId,
          eventId: mockEventId,
          name: "WELLB模擬店",
          displayOrder: -1,
        });

        expect(Result.isFailure(result)).toBe(true);
        if (Result.isFailure(result)) {
          expect(result.error.code).toBe("VALIDATION_ERROR");
        }
      });
    });

    describe("updateProjectCategoryEntity", () => {
      it("updates name while keeping other fields", () => {
        const category = createMockProjectCategory({ name: "旧区分", displayOrder: 2 });

        const result = updateProjectCategoryEntity(category, { name: "INIADホール企画" });

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.id).toBe(category.id);
          expect(result.value.eventId).toBe(category.eventId);
          expect(result.value.displayOrder).toBe(category.displayOrder);
          expect(result.value.createdAt).toBe(category.createdAt);
          expect(result.value.name).toBe("INIADホール企画");
        }
      });

      it("trims surrounding whitespace from name", () => {
        const category = createMockProjectCategory();

        const result = updateProjectCategoryEntity(category, { name: "  INIADホール企画  " });

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.name).toBe("INIADホール企画");
        }
      });

      it("fails when name is empty", () => {
        const category = createMockProjectCategory();

        const result = updateProjectCategoryEntity(category, { name: "" });

        expect(Result.isFailure(result)).toBe(true);
        if (Result.isFailure(result)) {
          expect(result.error.code).toBe("VALIDATION_ERROR");
        }
      });
    });
  });
});
