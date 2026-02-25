/**
 * Authorization service implementation tests
 */

import { describe, expect, it } from "vitest";
import { Result } from "@praha/byethrow";
import { AuthorizationServiceImpl } from "./authorization-service-impl";
import type { CommitteeRole, OrgRole } from "@/domain/authorization/schema";
import {
  createActor,
  eventResource,
  organizationResource,
  projectResource,
} from "@/domain/authorization/logic";
import { cast } from "@/domain/shared/ids";
import type { EventId, OrgId, ProjectId, UserId } from "@/domain/shared/ids";

describe("AuthorizationServiceImpl", () => {
  const authService = new AuthorizationServiceImpl();

  describe("Global Admin", () => {
    it("should allow global admin to perform any action", () => {
      const actor = createActor(cast<UserId>("user_1"), "admin");
      const eventId = cast<EventId>("event_1");
      const resource = eventResource(eventId);

      // Event actions
      const createResult = authService.isAllowed(actor, resource, "event:create");
      expect(Result.isSuccess(createResult)).toBe(true);
      if (Result.isSuccess(createResult)) {
        expect(createResult.value).toBe(true);
      }

      const updateResult = authService.isAllowed(actor, resource, "event:update");
      expect(Result.isSuccess(updateResult)).toBe(true);
      if (Result.isSuccess(updateResult)) {
        expect(updateResult.value).toBe(true);
      }

      const archiveResult = authService.isAllowed(actor, resource, "event:archive");
      expect(Result.isSuccess(archiveResult)).toBe(true);
      if (Result.isSuccess(archiveResult)) {
        expect(archiveResult.value).toBe(true);
      }

      const activateResult = authService.isAllowed(actor, resource, "event:activate");
      expect(Result.isSuccess(activateResult)).toBe(true);
      if (Result.isSuccess(activateResult)) {
        expect(activateResult.value).toBe(true);
      }

      const readResult = authService.isAllowed(actor, resource, "event:read");
      expect(Result.isSuccess(readResult)).toBe(true);
      if (Result.isSuccess(readResult)) {
        expect(readResult.value).toBe(true);
      }
    });
  });

  describe("Event Authorization", () => {
    describe("event:create", () => {
      it("should deny non-admin users", () => {
        const actor = createActor(cast<UserId>("user_1"));
        const eventId = cast<EventId>("event_1");
        const resource = eventResource(eventId);

        const result = authService.checkPermission(actor, resource, "event:create");
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.allowed).toBe(false);
          expect(result.value.reason).toContain("システム管理者");
        }
      });

      it("should deny committee admin (event-level admin)", () => {
        const eventId = cast<EventId>("event_1");
        const committeeRoles = new Map<EventId, CommitteeRole>([[eventId, "admin"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", committeeRoles);
        const resource = eventResource(eventId);

        const result = authService.checkPermission(actor, resource, "event:create");
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.allowed).toBe(false);
          expect(result.value.reason).toContain("システム管理者");
        }
      });
    });

    describe("event:update", () => {
      it("should allow event committee admin", () => {
        const eventId = cast<EventId>("event_1");
        const committeeRoles = new Map<EventId, CommitteeRole>([[eventId, "admin"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", committeeRoles);
        const resource = eventResource(eventId);

        const updateResult = authService.isAllowed(actor, resource, "event:update");
        expect(Result.isSuccess(updateResult)).toBe(true);
        if (Result.isSuccess(updateResult)) {
          expect(updateResult.value).toBe(true);
        }
      });

      it("should deny event committee approver (not admin)", () => {
        const eventId = cast<EventId>("event_1");
        const committeeRoles = new Map<EventId, CommitteeRole>([[eventId, "approver"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", committeeRoles);
        const resource = eventResource(eventId);

        const updateResult = authService.checkPermission(actor, resource, "event:update");
        expect(Result.isSuccess(updateResult)).toBe(true);
        if (Result.isSuccess(updateResult)) {
          expect(updateResult.value.allowed).toBe(false);
          expect(updateResult.value.reason).toContain("イベント管理者");
        }
      });

      it("should deny user without event role", () => {
        const eventId = cast<EventId>("event_1");
        const actor = createActor(cast<UserId>("user_1"));
        const resource = eventResource(eventId);

        const updateResult = authService.checkPermission(actor, resource, "event:update");
        expect(Result.isSuccess(updateResult)).toBe(true);
        if (Result.isSuccess(updateResult)) {
          expect(updateResult.value.allowed).toBe(false);
        }
      });

      it("should allow admin for one event but not another", () => {
        const event1 = cast<EventId>("event_1");
        const event2 = cast<EventId>("event_2");
        const committeeRoles = new Map<EventId, CommitteeRole>([[event1, "admin"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", committeeRoles);

        const resource1 = eventResource(event1);
        const resource2 = eventResource(event2);

        const result1 = authService.isAllowed(actor, resource1, "event:update");
        expect(Result.isSuccess(result1)).toBe(true);
        if (Result.isSuccess(result1)) {
          expect(result1.value).toBe(true);
        }

        const result2 = authService.checkPermission(actor, resource2, "event:update");
        expect(Result.isSuccess(result2)).toBe(true);
        if (Result.isSuccess(result2)) {
          expect(result2.value.allowed).toBe(false);
        }
      });
    });

    describe("event:archive / event:activate", () => {
      it("should deny event committee admin (only global admin allowed)", () => {
        const eventId = cast<EventId>("event_1");
        const committeeRoles = new Map<EventId, CommitteeRole>([[eventId, "admin"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", committeeRoles);
        const resource = eventResource(eventId);

        const archiveResult = authService.checkPermission(actor, resource, "event:archive");
        expect(Result.isSuccess(archiveResult)).toBe(true);
        if (Result.isSuccess(archiveResult)) {
          expect(archiveResult.value.allowed).toBe(false);
          expect(archiveResult.value.reason).toContain("システム管理者");
        }

        const activateResult = authService.checkPermission(actor, resource, "event:activate");
        expect(Result.isSuccess(activateResult)).toBe(true);
        if (Result.isSuccess(activateResult)) {
          expect(activateResult.value.allowed).toBe(false);
          expect(activateResult.value.reason).toContain("システム管理者");
        }
      });
    });

    describe("event:read", () => {
      it("should allow anyone to read events", () => {
        const eventId = cast<EventId>("event_1");
        const actor = createActor(cast<UserId>("user_1"), "user");
        const resource = eventResource(eventId);

        const result = authService.isAllowed(actor, resource, "event:read");
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value).toBe(true);
        }
      });
    });
  });

  describe("Project Authorization", () => {
    describe("project:create", () => {
      it("should allow committee admin", () => {
        const projectId = cast<ProjectId>("project_1");
        const eventId = cast<EventId>("event_1");
        const orgId = cast<OrgId>("org_1");
        const committeeRoles = new Map<EventId, CommitteeRole>([[eventId, "admin"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", committeeRoles);
        const resource = projectResource(projectId, eventId, orgId);

        const result = authService.isAllowed(actor, resource, "project:create");
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value).toBe(true);
        }
      });

      it("should deny organization manager", () => {
        const projectId = cast<ProjectId>("project_1");
        const eventId = cast<EventId>("event_1");
        const orgId = cast<OrgId>("org_1");
        const orgRoles = new Map<OrgId, OrgRole>([[orgId, "manager"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", new Map(), orgRoles);
        const resource = projectResource(projectId, eventId, orgId);

        const result = authService.checkPermission(actor, resource, "project:create");
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.allowed).toBe(false);
          expect(result.value.reason).toContain("委員会管理者");
        }
      });

      it("should deny organization editor", () => {
        const projectId = cast<ProjectId>("project_1");
        const eventId = cast<EventId>("event_1");
        const orgId = cast<OrgId>("org_1");
        const orgRoles = new Map<OrgId, OrgRole>([[orgId, "editor"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", new Map(), orgRoles);
        const resource = projectResource(projectId, eventId, orgId);

        const result = authService.checkPermission(actor, resource, "project:create");
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.allowed).toBe(false);
          expect(result.value.reason).toContain("委員会管理者");
        }
      });
    });

    describe("project:update", () => {
      it("should allow committee admin", () => {
        const projectId = cast<ProjectId>("project_1");
        const eventId = cast<EventId>("event_1");
        const orgId = cast<OrgId>("org_1");
        const committeeRoles = new Map<EventId, CommitteeRole>([[eventId, "admin"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", committeeRoles);
        const resource = projectResource(projectId, eventId, orgId);

        const result = authService.isAllowed(actor, resource, "project:update");
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value).toBe(true);
        }
      });

      it("should deny organization manager", () => {
        const projectId = cast<ProjectId>("project_1");
        const eventId = cast<EventId>("event_1");
        const orgId = cast<OrgId>("org_1");
        const orgRoles = new Map<OrgId, OrgRole>([[orgId, "manager"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", new Map(), orgRoles);
        const resource = projectResource(projectId, eventId, orgId);

        const result = authService.checkPermission(actor, resource, "project:update");
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.allowed).toBe(false);
          expect(result.value.reason).toContain("委員会管理者");
        }
      });

      it("should deny organization editor", () => {
        const projectId = cast<ProjectId>("project_1");
        const eventId = cast<EventId>("event_1");
        const orgId = cast<OrgId>("org_1");
        const orgRoles = new Map<OrgId, OrgRole>([[orgId, "editor"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", new Map(), orgRoles);
        const resource = projectResource(projectId, eventId, orgId);

        const result = authService.checkPermission(actor, resource, "project:update");
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.allowed).toBe(false);
          expect(result.value.reason).toContain("委員会管理者");
        }
      });
    });

    describe("project:submit", () => {
      it("should allow organization manager", () => {
        const projectId = cast<ProjectId>("project_1");
        const eventId = cast<EventId>("event_1");
        const orgId = cast<OrgId>("org_1");
        const orgRoles = new Map<OrgId, OrgRole>([[orgId, "manager"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", new Map(), orgRoles);
        const resource = projectResource(projectId, eventId, orgId);

        const result = authService.isAllowed(actor, resource, "project:submit");
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value).toBe(true);
        }
      });

      it("should deny organization editor", () => {
        const projectId = cast<ProjectId>("project_1");
        const eventId = cast<EventId>("event_1");
        const orgId = cast<OrgId>("org_1");
        const orgRoles = new Map<OrgId, OrgRole>([[orgId, "editor"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", new Map(), orgRoles);
        const resource = projectResource(projectId, eventId, orgId);

        const submitResult = authService.checkPermission(actor, resource, "project:submit");
        expect(Result.isSuccess(submitResult)).toBe(true);
        if (Result.isSuccess(submitResult)) {
          expect(submitResult.value.allowed).toBe(false);
          expect(submitResult.value.reason).toContain("組織マネージャー");
        }
      });
    });

    describe("project:approve / project:return", () => {
      it("should allow event committee admin", () => {
        const projectId = cast<ProjectId>("project_1");
        const eventId = cast<EventId>("event_1");
        const orgId = cast<OrgId>("org_1");
        const committeeRoles = new Map<EventId, CommitteeRole>([[eventId, "admin"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", committeeRoles);
        const resource = projectResource(projectId, eventId, orgId);

        const approveResult = authService.isAllowed(actor, resource, "project:approve");
        expect(Result.isSuccess(approveResult)).toBe(true);
        if (Result.isSuccess(approveResult)) {
          expect(approveResult.value).toBe(true);
        }

        const returnResult = authService.isAllowed(actor, resource, "project:return");
        expect(Result.isSuccess(returnResult)).toBe(true);
        if (Result.isSuccess(returnResult)) {
          expect(returnResult.value).toBe(true);
        }
      });

      it("should allow event committee approver", () => {
        const projectId = cast<ProjectId>("project_1");
        const eventId = cast<EventId>("event_1");
        const orgId = cast<OrgId>("org_1");
        const committeeRoles = new Map<EventId, CommitteeRole>([[eventId, "approver"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", committeeRoles);
        const resource = projectResource(projectId, eventId, orgId);

        const approveResult = authService.isAllowed(actor, resource, "project:approve");
        expect(Result.isSuccess(approveResult)).toBe(true);
        if (Result.isSuccess(approveResult)) {
          expect(approveResult.value).toBe(true);
        }

        const returnResult = authService.isAllowed(actor, resource, "project:return");
        expect(Result.isSuccess(returnResult)).toBe(true);
        if (Result.isSuccess(returnResult)) {
          expect(returnResult.value).toBe(true);
        }
      });

      it("should deny event committee member (not approver)", () => {
        const projectId = cast<ProjectId>("project_1");
        const eventId = cast<EventId>("event_1");
        const orgId = cast<OrgId>("org_1");
        const committeeRoles = new Map<EventId, CommitteeRole>([[eventId, "member"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", committeeRoles);
        const resource = projectResource(projectId, eventId, orgId);

        const approveResult = authService.checkPermission(actor, resource, "project:approve");
        expect(Result.isSuccess(approveResult)).toBe(true);
        if (Result.isSuccess(approveResult)) {
          expect(approveResult.value.allowed).toBe(false);
          expect(approveResult.value.reason).toContain("イベント承認者");
        }
      });
    });
  });

  describe("Organization Authorization", () => {
    describe("organization:create", () => {
      it("should allow committee admin", () => {
        const orgId = cast<OrgId>("org_1");
        const eventId = cast<EventId>("event_1");
        const committeeRoles = new Map<EventId, CommitteeRole>([[eventId, "admin"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", committeeRoles);
        const resource = organizationResource(orgId, eventId);

        const result = authService.isAllowed(actor, resource, "organization:create");
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value).toBe(true);
        }
      });
    });

    describe("organization:update", () => {
      it("should allow committee admin", () => {
        const orgId = cast<OrgId>("org_1");
        const eventId = cast<EventId>("event_1");
        const committeeRoles = new Map<EventId, CommitteeRole>([[eventId, "admin"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", committeeRoles);
        const resource = organizationResource(orgId, eventId);

        const result = authService.isAllowed(actor, resource, "organization:update");
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value).toBe(true);
        }
      });

      it("should deny organization manager", () => {
        const orgId = cast<OrgId>("org_1");
        const eventId = cast<EventId>("event_1");
        const orgRoles = new Map<OrgId, OrgRole>([[orgId, "manager"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", new Map(), orgRoles);
        const resource = organizationResource(orgId, eventId);

        const result = authService.checkPermission(actor, resource, "organization:update");
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.allowed).toBe(false);
          expect(result.value.reason).toContain("委員会管理者");
        }
      });

      it("should deny organization editor", () => {
        const orgId = cast<OrgId>("org_1");
        const eventId = cast<EventId>("event_1");
        const orgRoles = new Map<OrgId, OrgRole>([[orgId, "editor"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", new Map(), orgRoles);
        const resource = organizationResource(orgId, eventId);

        const result = authService.checkPermission(actor, resource, "organization:update");
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.allowed).toBe(false);
          expect(result.value.reason).toContain("委員会管理者");
        }
      });

      it("should deny user without roles", () => {
        const orgId = cast<OrgId>("org_1");
        const eventId = cast<EventId>("event_1");
        const actor = createActor(cast<UserId>("user_1"), "user");
        const resource = organizationResource(orgId, eventId);

        const updateResult = authService.checkPermission(actor, resource, "organization:update");
        expect(Result.isSuccess(updateResult)).toBe(true);
        if (Result.isSuccess(updateResult)) {
          expect(updateResult.value.allowed).toBe(false);
          expect(updateResult.value.reason).toContain("委員会管理者");
        }
      });
    });

    describe("organization:manage_members", () => {
      it("should allow organization manager", () => {
        const orgId = cast<OrgId>("org_1");
        const eventId = cast<EventId>("event_1");
        const orgRoles = new Map<OrgId, OrgRole>([[orgId, "manager"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", new Map(), orgRoles);
        const resource = organizationResource(orgId, eventId);

        const result = authService.isAllowed(actor, resource, "organization:manage_members");
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value).toBe(true);
        }
      });

      it("should deny organization editor", () => {
        const orgId = cast<OrgId>("org_1");
        const eventId = cast<EventId>("event_1");
        const orgRoles = new Map<OrgId, OrgRole>([[orgId, "editor"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", new Map(), orgRoles);
        const resource = organizationResource(orgId, eventId);

        const manageResult = authService.checkPermission(
          actor,
          resource,
          "organization:manage_members",
        );
        expect(Result.isSuccess(manageResult)).toBe(true);
        if (Result.isSuccess(manageResult)) {
          expect(manageResult.value.allowed).toBe(false);
          expect(manageResult.value.reason).toContain("組織マネージャー");
        }
      });
    });
  });

  describe("enforce", () => {
    it("should succeed if allowed", () => {
      const actor = createActor(cast<UserId>("user_1"), "admin");
      const eventId = cast<EventId>("event_1");
      const resource = eventResource(eventId);

      const result = authService.enforce(actor, resource, "event:create");
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(true);
      }
    });

    it("should fail if not allowed", () => {
      const actor = createActor(cast<UserId>("user_1"), "user");
      const eventId = cast<EventId>("event_1");
      const resource = eventResource(eventId);

      const result = authService.enforce(actor, resource, "event:create");
      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.error.code).toBe("PERMISSION_DENIED");
      }
    });
  });
});
