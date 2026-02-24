import { Result } from "@praha/byethrow";
import { describe, expect, it } from "vitest";
import type { Deadline, Event, Place } from "./schema";
import type { EventId, PlaceId } from "../shared/ids";
import {
  activateEvent,
  addPlace,
  archiveEvent,
  canModifyEvent,
  createEventEntity,
  isFieldEditable,
  removePlace,
  updateEventEntity,
  updatePlace,
} from "./logic";

// Test fixtures
const mockEventId = "event_123" as EventId;
const mockPlaceId1 = "place_1" as PlaceId;
const mockPlaceId2 = "place_2" as PlaceId;

const createMockEvent = (overrides?: Partial<Event>): Event => ({
  id: mockEventId,
  name: "Test Event",
  slug: "2025",
  status: "active",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  ...overrides,
});

const createMockPlace = (id: PlaceId, name: string): Place => ({
  id,
  eventId: mockEventId,
  name,
  parentId: null,
  createdAt: new Date("2025-01-01"),
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

  describe("Place Management Functions", () => {
    describe("addPlace", () => {
      it("adds a new place to the list", () => {
        const places = [createMockPlace(mockPlaceId1, "Building 1")];
        const newPlace = createMockPlace(mockPlaceId2, "Building 2");

        const updatedPlaces = addPlace(places, newPlace);

        expect(updatedPlaces).toHaveLength(2);
        expect(updatedPlaces).toContain(newPlace);
      });
    });

    describe("removePlace", () => {
      it("removes the place from the list", () => {
        const places = [
          createMockPlace(mockPlaceId1, "Building 1"),
          createMockPlace(mockPlaceId2, "Building 2"),
        ];

        const updatedPlaces = removePlace(places, mockPlaceId1);

        expect(updatedPlaces).toHaveLength(1);
        expect(updatedPlaces[0].id).toBe(mockPlaceId2);
      });
    });

    describe("updatePlace", () => {
      it("updates the place in the list", () => {
        const places = [createMockPlace(mockPlaceId1, "Building 1")];
        const updatedPlace = { ...places[0], name: "Updated Building" };

        const updatedPlaces = updatePlace(places, updatedPlace);

        expect(updatedPlaces[0].name).toBe("Updated Building");
      });
    });
  });

  describe("Event Updates", () => {
    describe("createEventEntity", () => {
      it("creates active event with same createdAt and updatedAt", () => {
        const now = new Date("2025-02-01T10:00:00.000Z");
        const created = createEventEntity({
          id: mockEventId,
          name: "Created Event",
          slug: "created-event",
          now,
        });

        expect(created.id).toBe(mockEventId);
        expect(created.name).toBe("Created Event");
        expect(created.slug).toBe("created-event");
        expect(created.status).toBe("active");
        expect(created.createdAt).toBe(now);
        expect(created.updatedAt).toBe(now);
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

        const updated = updateEventEntity(event, {
          name: "New Name",
          slug: "new-slug",
          now,
        });

        expect(updated.id).toBe(event.id);
        expect(updated.status).toBe(event.status);
        expect(updated.createdAt).toBe(event.createdAt);
        expect(updated.name).toBe("New Name");
        expect(updated.slug).toBe("new-slug");
        expect(updated.updatedAt).toBe(now);
      });
    });

    describe("archiveEvent", () => {
      it("changes event status to archived", () => {
        const event = createMockEvent({ status: "active" });
        const archived = archiveEvent(event);

        expect(archived.status).toBe("archived");
        expect(archived.updatedAt).not.toEqual(event.updatedAt);
      });
    });

    describe("activateEvent", () => {
      it("changes event status to active", () => {
        const event = createMockEvent({ status: "archived" });
        const activated = activateEvent(event);

        expect(activated.status).toBe("active");
        expect(activated.updatedAt).not.toEqual(event.updatedAt);
      });
    });
  });
});
