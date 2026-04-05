import { Result } from "@akabase/result";
import { describe, expect, it } from "vite-plus/test";
import type { OrgId, OrgMember, Organization } from "./schema";
import { cast } from "../shared/ids";
import type { EventId } from "../event/schema";
import type { ImageId } from "../shared/image";
import type { UserId } from "../user/schema";
import { canAddMember, canRemoveMember, updateOrganizationEntity } from "./logic";

// Test fixtures
const mockOrgId = cast<OrgId>("org_123");
const mockEventId = cast<EventId>("event_123");
const mockUserId1 = cast<UserId>("user_1");
const mockUserId2 = cast<UserId>("user_2");

const createMockOrganization = (overrides?: Partial<Organization>): Organization => ({
  id: mockOrgId,
  eventId: mockEventId,
  name: "Test Organization",
  description: "",
  logoImageId: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  ...overrides,
});

const createMockMember = (userId: UserId, role: "manager" | "editor" = "editor"): OrgMember => ({
  id: `member_${userId}`,
  orgId: mockOrgId,
  userId,
  role,
  createdAt: new Date("2025-01-01"),
});

describe("Organization Domain Logic", () => {
  describe("Invariant Checks", () => {
    describe("canAddMember", () => {
      it("succeeds when user is not a member", () => {
        const members: OrgMember[] = [createMockMember(mockUserId1)];
        const result = canAddMember(members, mockUserId2);

        expect(Result.isSuccess(result)).toBe(true);
      });

      it("fails when user is already a member", () => {
        const members: OrgMember[] = [createMockMember(mockUserId1)];
        const result = canAddMember(members, mockUserId1);

        expect(Result.isFailure(result)).toBe(true);
        if (Result.isFailure(result)) {
          expect(result.error.code).toBe("USER_ALREADY_MEMBER");
        }
      });
    });

    describe("canRemoveMember", () => {
      it("succeeds when removing a non-last manager", () => {
        const members: OrgMember[] = [
          createMockMember(mockUserId1, "manager"),
          createMockMember(mockUserId2, "manager"),
        ];
        const result = canRemoveMember(members, mockUserId1);

        expect(Result.isSuccess(result)).toBe(true);
      });

      it("succeeds when removing an editor", () => {
        const members: OrgMember[] = [
          createMockMember(mockUserId1, "manager"),
          createMockMember(mockUserId2, "editor"),
        ];
        const result = canRemoveMember(members, mockUserId2);

        expect(Result.isSuccess(result)).toBe(true);
      });

      it("succeeds when removing the last manager", () => {
        const members: OrgMember[] = [
          createMockMember(mockUserId1, "manager"),
          createMockMember(mockUserId2, "editor"),
        ];
        const result = canRemoveMember(members, mockUserId1);

        expect(Result.isSuccess(result)).toBe(true);
      });

      it("fails when user is not a member", () => {
        const members: OrgMember[] = [createMockMember(mockUserId1)];
        const result = canRemoveMember(members, mockUserId2);

        expect(Result.isFailure(result)).toBe(true);
        if (Result.isFailure(result)) {
          expect(result.error.code).toBe("USER_NOT_MEMBER");
        }
      });
    });
  });

  describe("Organization Updates", () => {
    describe("updateOrganization", () => {
      it("updates organization name", () => {
        const org = createMockOrganization({ name: "Old Name" });
        const result = updateOrganizationEntity(org, { name: "New Name" });

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.name).toBe("New Name");
          expect(result.value.updatedAt).not.toEqual(org.updatedAt);
        }
      });

      it("updates organization description when within 100 characters", () => {
        const org = createMockOrganization({ description: "" });
        const result = updateOrganizationEntity(org, { description: "New description" });

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.description).toBe("New description");
        }
      });

      it("fails when description exceeds 100 characters", () => {
        const org = createMockOrganization();
        const longDescription = "a".repeat(101);
        const result = updateOrganizationEntity(org, { description: longDescription });

        expect(Result.isFailure(result)).toBe(true);
        if (Result.isFailure(result)) {
          expect(result.error.code).toBe("VALIDATION_ERROR");
        }
      });

      it("succeeds for exactly 100 characters", () => {
        const org = createMockOrganization();
        const description = "a".repeat(100);
        const result = updateOrganizationEntity(org, { description });

        expect(Result.isSuccess(result)).toBe(true);
      });

      it("updates organization logo key", () => {
        const org = createMockOrganization({ logoImageId: null });
        const result = updateOrganizationEntity(org, {
          logoImageId: cast<ImageId>("logos/test.png"),
        });

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.logoImageId).toBe("logos/test.png");
        }
      });

      it("updates multiple fields at once", () => {
        const org = createMockOrganization();
        const result = updateOrganizationEntity(org, {
          name: "New Name",
          description: "New description",
          logoImageId: cast<ImageId>("logos/new.png"),
        });

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.name).toBe("New Name");
          expect(result.value.description).toBe("New description");
          expect(result.value.logoImageId).toBe("logos/new.png");
        }
      });

      it("fails when validation fails", () => {
        const org = createMockOrganization();
        const result = updateOrganizationEntity(org, { name: "" }); // Empty name should fail

        expect(Result.isFailure(result)).toBe(true);
        if (Result.isFailure(result)) {
          expect(result.error.code).toBe("VALIDATION_ERROR");
        }
      });
    });
  });
});
