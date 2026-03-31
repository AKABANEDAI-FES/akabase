/**
 * Authorization service tests
 */

import { describe, expect, it } from "vite-plus/test";
import { Result } from "@archive/result";
import { AuthorizationService } from "./service";
import type { CommitteeRole, OrgRole } from "./schema";
import {
  createActor,
  eventResource,
  organizationResource,
  projectResource,
  userResource,
} from "./logic";
import { cast } from "../shared/ids";
import type { EventId } from "../event/schema";
import type { OrgId } from "../organization/schema";
import type { ProjectId } from "../project/schema";
import type { UserId } from "../user/schema";

describe("AuthorizationService", () => {
  const authService = new AuthorizationService();

  describe("グローバル管理者", () => {
    it("全てのアクションを許可する", () => {
      const actor = createActor(cast<UserId>("user_1"), "admin");
      const eventId = cast<EventId>("event_1");
      const resource = eventResource(eventId);

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

  describe("イベント認可", () => {
    describe("event:create", () => {
      it("非管理者ユーザーを拒否する", () => {
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

      it("委員会管理者（イベントレベル）を拒否する", () => {
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
      it("イベント委員会管理者を許可する", () => {
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

      it("イベント委員会承認者（非管理者）を拒否する", () => {
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

      it("イベントロールなしのユーザーを拒否する", () => {
        const eventId = cast<EventId>("event_1");
        const actor = createActor(cast<UserId>("user_1"));
        const resource = eventResource(eventId);

        const updateResult = authService.checkPermission(actor, resource, "event:update");
        expect(Result.isSuccess(updateResult)).toBe(true);
        if (Result.isSuccess(updateResult)) {
          expect(updateResult.value.allowed).toBe(false);
        }
      });

      it("あるイベントの管理者が別のイベントでは拒否される", () => {
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
      it("イベント委員会管理者を拒否する（グローバル管理者のみ許可）", () => {
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
      it("全てのユーザーがイベントを閲覧できる", () => {
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

  describe("プロジェクト認可", () => {
    describe("project:create", () => {
      it("委員会管理者を許可する", () => {
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

      it("出展団体マネージャーを拒否する", () => {
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

      it("出展団体エディターを拒否する", () => {
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
      it("委員会管理者を許可する", () => {
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

      it("出展団体マネージャーを拒否する", () => {
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

      it("出展団体エディターを拒否する", () => {
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
      it("出展団体マネージャーを許可する", () => {
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

      it("出展団体エディターを拒否する", () => {
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
          expect(submitResult.value.reason).toContain("出展団体マネージャー");
        }
      });
    });

    describe("project:approve / project:return", () => {
      it("イベント委員会管理者を許可する", () => {
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

      it("イベント委員会承認者を許可する", () => {
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

      it("イベント委員会メンバー（非承認者）を拒否する", () => {
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

  describe("出展団体認可", () => {
    describe("organization:create", () => {
      it("委員会管理者を許可する", () => {
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
      it("委員会管理者を許可する", () => {
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

      it("出展団体マネージャーを拒否する", () => {
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

      it("出展団体エディターを拒否する", () => {
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

      it("ロールなしのユーザーを拒否する", () => {
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
      it("出展団体マネージャーを許可する", () => {
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

      it("出展団体エディターを拒否する", () => {
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
          expect(manageResult.value.reason).toContain("出展団体マネージャー");
        }
      });
    });
  });

  describe("enforce", () => {
    it("許可された場合に成功する", () => {
      const actor = createActor(cast<UserId>("user_1"), "admin");
      const eventId = cast<EventId>("event_1");
      const resource = eventResource(eventId);

      const result = authService.enforce(actor, resource, "event:create");
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(true);
      }
    });

    it("拒否された場合にエラーを返す", () => {
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

  describe("ユーザー認可", () => {
    describe("user:list", () => {
      it("非グローバル管理者を拒否する", () => {
        const actor = createActor(cast<UserId>("user_1"));
        const resource = userResource(cast<UserId>("user_2"));
        const result = authService.checkPermission(actor, resource, "user:list");

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.allowed).toBe(false);
          expect(result.value.reason).toContain("グローバル管理者");
        }
      });

      it("グローバル管理者を許可する", () => {
        const actor = createActor(cast<UserId>("user_1"), "admin");
        const resource = userResource(cast<UserId>("user_2"));
        const result = authService.isAllowed(actor, resource, "user:list");

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value).toBe(true);
        }
      });
    });

    describe("user:list_for_event", () => {
      it("委員会メンバーを許可する", () => {
        const eventId = cast<EventId>("event_1");
        const committeeRoles = new Map<EventId, CommitteeRole>([[eventId, "member"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", committeeRoles);
        const resource = eventResource(eventId);

        const result = authService.isAllowed(actor, resource, "user:list_for_event");
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value).toBe(true);
        }
      });

      it("非委員会メンバーを拒否する", () => {
        const eventId = cast<EventId>("event_1");
        const actor = createActor(cast<UserId>("user_1"));
        const resource = eventResource(eventId);

        const result = authService.checkPermission(actor, resource, "user:list_for_event");
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.allowed).toBe(false);
          expect(result.value.reason).toContain("委員会メンバー");
        }
      });
    });
  });

  describe("イベント認可 - 提出一覧", () => {
    describe("event:list_submissions", () => {
      it("委員会メンバーを許可する", () => {
        const eventId = cast<EventId>("event_1");
        const committeeRoles = new Map<EventId, CommitteeRole>([[eventId, "member"]]);
        const actor = createActor(cast<UserId>("user_1"), "user", committeeRoles);
        const resource = eventResource(eventId);

        const result = authService.isAllowed(actor, resource, "event:list_submissions");
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value).toBe(true);
        }
      });

      it("非委員会メンバーを拒否する", () => {
        const eventId = cast<EventId>("event_1");
        const actor = createActor(cast<UserId>("user_1"));
        const resource = eventResource(eventId);

        const result = authService.checkPermission(actor, resource, "event:list_submissions");
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.value.allowed).toBe(false);
          expect(result.value.reason).toContain("委員会メンバー");
        }
      });
    });
  });
});
