import { Result } from "@praha/byethrow";
import { describe, expect, it } from "vitest";
import type { Deadline, Event, Place, Tag } from "./schema";
import type { EventId, PlaceId, TagId } from "../shared/ids";
import {
  activateEvent,
  addPlace,
  addTag,
  archiveEvent,
  canModifyEvent,
  createEventEntity,
  isFieldEditable,
  isPlaceUnique,
  isTagSlugUnique,
  removePlace,
  removeTag,
  updateEventEntity,
  updatePlace,
  updateTag,
} from "./logic";

// Test fixtures
const mockEventId = "event_123" as EventId;
const mockTagId1 = "tag_1" as TagId;
const mockTagId2 = "tag_2" as TagId;
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

const createMockTag = (id: TagId, slug: string): Tag => ({
  id,
  eventId: mockEventId,
  name: `Tag ${slug}`,
  slug,
  createdAt: new Date("2025-01-01"),
});

const createMockPlace = (id: PlaceId, name: string): Place => ({
  id,
  eventId: mockEventId,
  name,
  slug: name.toLowerCase(),
  createdAt: new Date("2025-01-01"),
});

const createMockDeadline = (fieldKey: string, deadlineAt: Date): Deadline => ({
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

    describe("isTagSlugUnique", () => {
      it("succeeds when slug is unique", () => {
        const tags = [createMockTag(mockTagId1, "food")];
        const result = isTagSlugUnique(tags, "stage");

        expect(Result.isSuccess(result)).toBe(true);
      });

      it("fails when slug already exists", () => {
        const tags = [createMockTag(mockTagId1, "food")];
        const result = isTagSlugUnique(tags, "food");

        expect(Result.isFailure(result)).toBe(true);
        if (Result.isFailure(result)) {
          expect(result.error.code).toBe("TAG_SLUG_NOT_UNIQUE");
        }
      });

      it("succeeds when slug matches excluded tag", () => {
        const tags = [createMockTag(mockTagId1, "food")];
        const result = isTagSlugUnique(tags, "food", mockTagId1);

        expect(Result.isSuccess(result)).toBe(true);
      });
    });

    describe("isPlaceUnique", () => {
      it("succeeds when place name is unique", () => {
        const places = [createMockPlace(mockPlaceId1, "Building 1")];
        const result = isPlaceUnique(places, "Building 2");

        expect(Result.isSuccess(result)).toBe(true);
      });

      it("fails when place name already exists", () => {
        const places = [createMockPlace(mockPlaceId1, "Building 1")];
        const result = isPlaceUnique(places, "Building 1");

        expect(Result.isFailure(result)).toBe(true);
        if (Result.isFailure(result)) {
          expect(result.error.code).toBe("PLACE_NOT_UNIQUE");
        }
      });

      it("succeeds when name matches excluded place", () => {
        const places = [createMockPlace(mockPlaceId1, "Building 1")];
        const result = isPlaceUnique(places, "Building 1", mockPlaceId1);

        expect(Result.isSuccess(result)).toBe(true);
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

  describe("Tag Management Functions", () => {
    describe("addTag", () => {
      it("adds a new tag to the list", () => {
        const tags = [createMockTag(mockTagId1, "food")];
        const newTag = createMockTag(mockTagId2, "stage");

        const updatedTags = addTag(tags, newTag);

        expect(updatedTags).toHaveLength(2);
        expect(updatedTags).toContain(newTag);
      });

      it("does not mutate the original array", () => {
        const tags = [createMockTag(mockTagId1, "food")];
        const originalLength = tags.length;
        const newTag = createMockTag(mockTagId2, "stage");

        addTag(tags, newTag);

        expect(tags).toHaveLength(originalLength);
      });
    });

    describe("removeTag", () => {
      it("removes the tag from the list", () => {
        const tags = [createMockTag(mockTagId1, "food"), createMockTag(mockTagId2, "stage")];

        const updatedTags = removeTag(tags, mockTagId1);

        expect(updatedTags).toHaveLength(1);
        expect(updatedTags[0].id).toBe(mockTagId2);
      });

      it("does not mutate the original array", () => {
        const tags = [createMockTag(mockTagId1, "food")];
        const originalLength = tags.length;

        removeTag(tags, mockTagId1);

        expect(tags).toHaveLength(originalLength);
      });
    });

    describe("updateTag", () => {
      it("updates the tag in the list", () => {
        const tags = [createMockTag(mockTagId1, "food")];
        const updatedTag = { ...tags[0], name: "Updated Name" };

        const updatedTags = updateTag(tags, updatedTag);

        expect(updatedTags[0].name).toBe("Updated Name");
      });

      it("does not mutate the original array", () => {
        const tags = [createMockTag(mockTagId1, "food")];
        const originalName = tags[0].name;
        const updatedTag = { ...tags[0], name: "Updated Name" };

        updateTag(tags, updatedTag);

        expect(tags[0].name).toBe(originalName);
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
