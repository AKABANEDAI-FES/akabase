/**
 * Authorization logic helper functions unit tests
 */

import { describe, expect, it } from "vitest";
import { createActor, getCommitteeRoleForEvent, getOrgRoleForOrg, isGlobalAdmin } from "./logic";
import type { CommitteeRole, OrgRole } from "./schema";
import { cast } from "../shared/ids";
import type { EventId } from "../event/schema";
import type { OrgId } from "../organization/schema";
import type { UserId } from "../user/schema";

describe("createActor", () => {
  it("should create an actor with minimal parameters", () => {
    const userId = cast<UserId>("user_123");
    const actor = createActor(userId, "admin");

    expect(actor.userId).toBe(userId);
    expect(actor.globalRole).toBe("admin");
    expect(actor.committeeRoles.size).toBe(0);
    expect(actor.orgRoles.size).toBe(0);
  });

  it("should create an actor with committee roles", () => {
    const userId = cast<UserId>("user_123");
    const eventId = cast<EventId>("event_1");
    const committeeRoles = new Map<EventId, CommitteeRole>([[eventId, "admin"]]);

    const actor = createActor(userId, "user", committeeRoles);

    expect(actor.userId).toBe(userId);
    expect(actor.globalRole).toBe("user");
    expect(actor.committeeRoles.get(eventId)).toBe("admin");
  });

  it("should create an actor with organization roles", () => {
    const userId = cast<UserId>("user_123");
    const orgId = cast<OrgId>("org_1");
    const orgRoles = new Map<OrgId, OrgRole>([[orgId, "manager"]]);

    const actor = createActor(userId, "user", new Map(), orgRoles);

    expect(actor.userId).toBe(userId);
    expect(actor.globalRole).toBe("user");
    expect(actor.orgRoles.get(orgId)).toBe("manager");
  });

  it("should create an actor with all permissions", () => {
    const userId = cast<UserId>("user_123");
    const eventId = cast<EventId>("event_1");
    const orgId = cast<OrgId>("org_1");
    const committeeRoles = new Map<EventId, CommitteeRole>([[eventId, "approver"]]);
    const orgRoles = new Map<OrgId, OrgRole>([[orgId, "editor"]]);

    const actor = createActor(userId, "admin", committeeRoles, orgRoles);

    expect(actor.userId).toBe(userId);
    expect(actor.globalRole).toBe("admin");
    expect(actor.committeeRoles.get(eventId)).toBe("approver");
    expect(actor.orgRoles.get(orgId)).toBe("editor");
  });
});

describe("isGlobalAdmin", () => {
  it("should return true for global admin", () => {
    const actor = createActor(cast<UserId>("user_123"), "admin");
    expect(isGlobalAdmin(actor)).toBe(true);
  });

  it("should return false for non-admin", () => {
    const actor = createActor(cast<UserId>("user_123"), "user");
    expect(isGlobalAdmin(actor)).toBe(false);
  });

  it("should return false even if user has committee admin role", () => {
    const eventId = cast<EventId>("event_1");
    const committeeRoles = new Map<EventId, CommitteeRole>([[eventId, "admin"]]);
    const actor = createActor(cast<UserId>("user_123"), "user", committeeRoles);

    expect(isGlobalAdmin(actor)).toBe(false);
  });
});

describe("getCommitteeRoleForEvent", () => {
  it("should return committee role for event", () => {
    const eventId = cast<EventId>("event_1");
    const committeeRoles = new Map<EventId, CommitteeRole>([[eventId, "admin"]]);
    const actor = createActor(cast<UserId>("user_123"), "user", committeeRoles);

    expect(getCommitteeRoleForEvent(actor, eventId)).toBe("admin");
  });

  it("should return default for event without role", () => {
    const eventId1 = cast<EventId>("event_1");
    const eventId2 = cast<EventId>("event_2");
    const committeeRoles = new Map<EventId, CommitteeRole>([[eventId1, "admin"]]);
    const actor = createActor(cast<UserId>("user_123"), "user", committeeRoles);

    expect(getCommitteeRoleForEvent(actor, eventId2)).toBe("default");
  });

  it("should handle different committee roles", () => {
    const event1 = cast<EventId>("event_1");
    const event2 = cast<EventId>("event_2");
    const event3 = cast<EventId>("event_3");
    const committeeRoles = new Map<EventId, CommitteeRole>([
      [event1, "admin"],
      [event2, "approver"],
      [event3, "member"],
    ]);
    const actor = createActor(cast<UserId>("user_123"), "user", committeeRoles);

    expect(getCommitteeRoleForEvent(actor, event1)).toBe("admin");
    expect(getCommitteeRoleForEvent(actor, event2)).toBe("approver");
    expect(getCommitteeRoleForEvent(actor, event3)).toBe("member");
  });
});

describe("getOrgRoleForOrg", () => {
  it("should return organization role for org", () => {
    const orgId = cast<OrgId>("org_1");
    const orgRoles = new Map<OrgId, OrgRole>([[orgId, "manager"]]);
    const actor = createActor(cast<UserId>("user_123"), "user", new Map(), orgRoles);

    expect(getOrgRoleForOrg(actor, orgId)).toBe("manager");
  });

  it("should return null for org without role", () => {
    const orgId1 = cast<OrgId>("org_1");
    const orgId2 = cast<OrgId>("org_2");
    const orgRoles = new Map<OrgId, OrgRole>([[orgId1, "manager"]]);
    const actor = createActor(cast<UserId>("user_123"), "user", new Map(), orgRoles);

    expect(getOrgRoleForOrg(actor, orgId2)).toBe(null);
  });

  it("should handle different organization roles", () => {
    const org1 = cast<OrgId>("org_1");
    const org2 = cast<OrgId>("org_2");
    const orgRoles = new Map<OrgId, OrgRole>([
      [org1, "manager"],
      [org2, "editor"],
    ]);
    const actor = createActor(cast<UserId>("user_123"), "user", new Map(), orgRoles);

    expect(getOrgRoleForOrg(actor, org1)).toBe("manager");
    expect(getOrgRoleForOrg(actor, org2)).toBe("editor");
  });
});
