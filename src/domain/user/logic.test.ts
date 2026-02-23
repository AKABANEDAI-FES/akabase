/**
 * User domain logic tests
 */

import { describe, expect, it } from "vitest";
import {
  createCommitteeRoleAssignment,
  updateCommitteeRoleAssignment,
  updateUserGlobalRole,
} from "./logic";
import type { CommitteeRoleAssignment, User } from "./schema";
import { cast } from "@/domain/shared/ids";

describe("User domain logic", () => {
  describe("updateUserGlobalRole", () => {
    it("should update user role and timestamp", () => {
      const user: User = {
        id: cast("user_1"),
        name: "Test User",
        email: "test@toyo.jp",
        emailVerified: true,
        image: null,
        role: "user",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      };

      const updated = updateUserGlobalRole(user, "admin");

      expect(updated.role).toBe("admin");
      expect(updated.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
      expect(updated.id).toBe(user.id);
      expect(updated.name).toBe(user.name);
      expect(updated.email).toBe(user.email);
    });

    it("should not mutate original user object", () => {
      const user: User = {
        id: cast("user_1"),
        name: "Test User",
        email: "test@toyo.jp",
        emailVerified: true,
        image: null,
        role: "user",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      };

      const originalRole = user.role;
      const originalUpdatedAt = user.updatedAt;

      updateUserGlobalRole(user, "admin");

      expect(user.role).toBe(originalRole);
      expect(user.updatedAt).toBe(originalUpdatedAt);
    });
  });

  describe("createCommitteeRoleAssignment", () => {
    it("should create new assignment with all fields", () => {
      const assignment = createCommitteeRoleAssignment(
        "assign_1",
        cast("event_1"),
        cast("user_1"),
        "admin",
      );

      expect(assignment.id).toBe("assign_1");
      expect(assignment.eventId).toBe("event_1");
      expect(assignment.userId).toBe("user_1");
      expect(assignment.role).toBe("admin");
      expect(assignment.createdAt).toBeInstanceOf(Date);
    });

    it("should create assignment with current timestamp", () => {
      const beforeCreate = new Date();
      const assignment = createCommitteeRoleAssignment(
        "assign_1",
        cast("event_1"),
        cast("user_1"),
        "member",
      );
      const afterCreate = new Date();

      expect(assignment.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(assignment.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe("updateCommitteeRoleAssignment", () => {
    it("should update assignment role", () => {
      const original: CommitteeRoleAssignment = {
        id: "assign_1",
        eventId: cast("event_1"),
        userId: cast("user_1"),
        role: "member",
        createdAt: new Date("2025-01-01"),
      };

      const updated = updateCommitteeRoleAssignment(original, "admin");

      expect(updated.role).toBe("admin");
      expect(updated.id).toBe(original.id);
      expect(updated.eventId).toBe(original.eventId);
      expect(updated.userId).toBe(original.userId);
      expect(updated.createdAt).toBe(original.createdAt);
    });

    it("should not mutate original assignment object", () => {
      const original: CommitteeRoleAssignment = {
        id: "assign_1",
        eventId: cast("event_1"),
        userId: cast("user_1"),
        role: "member",
        createdAt: new Date("2025-01-01"),
      };

      const originalRole = original.role;

      updateCommitteeRoleAssignment(original, "admin");

      expect(original.role).toBe(originalRole);
    });
  });
});
