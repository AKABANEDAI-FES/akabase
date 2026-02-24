import { Result } from "@praha/byethrow";
import { describe, expect, it } from "vitest";
import type { Deadline, Event } from "./schema";
import type { EventId } from "../shared/ids";
import {
  activateEvent,
  archiveEvent,
  canModifyEvent,
  createEventEntity,
  isFieldEditable,
  updateEventEntity,
} from "./logic";

// Test fixtures
const mockEventId = "event_123" as EventId;

const createMockEvent = (overrides?: Partial<Event>): Event => ({
  id: mockEventId,
  name: "Test Event",
  slug: "2025",
  status: "active",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  ...overrides,
});

const createMockDeadline = (fieldKey: Deadline["fieldKey"], deadlineAt: Date): Deadline => ({
  id: `deadline_${fieldKey}` as any,
  eventId: mockEventId,
  fieldKey,
  deadlineAt,
  createdAt: new Date("2025-01-01"),
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

    describe("isFieldEditable", () => {
      it("succeeds when no deadline exists", () => {
        const deadlines: Deadline[] = [];
        const result = isFieldEditable(deadlines, "pamphlet_text", new Date("2025-02-01"), false);

        expect(Result.isSuccess(result)).toBe(true);
      });

      it("succeeds when before deadline", () => {
        const deadlines = [createMockDeadline("pamphlet_text", new Date("2025-02-28"))];
        const result = isFieldEditable(deadlines, "pamphlet_text", new Date("2025-02-01"), false);

        expect(Result.isSuccess(result)).toBe(true);
      });

      it("fails when past deadline and not admin", () => {
        const deadlines = [createMockDeadline("pamphlet_text", new Date("2025-02-28"))];
        const result = isFieldEditable(deadlines, "pamphlet_text", new Date("2025-03-01"), false);

        expect(Result.isFailure(result)).toBe(true);
        if (Result.isFailure(result)) {
          expect(result.error.code).toBe("FIELD_PAST_DEADLINE");
        }
      });

      it("succeeds when past deadline but user is admin", () => {
        const deadlines = [createMockDeadline("pamphlet_text", new Date("2025-02-28"))];
        const result = isFieldEditable(deadlines, "pamphlet_text", new Date("2025-03-01"), true);

        expect(Result.isSuccess(result)).toBe(true);
      });

      it("succeeds for different field when deadline exists for another field", () => {
        const deadlines = [createMockDeadline("pamphlet_text", new Date("2025-02-28"))];
        const result = isFieldEditable(deadlines, "web_content", new Date("2025-03-01"), false);

        expect(Result.isSuccess(result)).toBe(true);
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
});
