/**
 * Authorization service implementation
 * Implements permission rules for all resources and actions
 */

import { Result } from "@praha/byethrow";
import type { Action, Actor, AuthorizationDecision, Resource } from "@/domain/authorization/schema";
import {
  getCommitteeRoleForEvent,
  getOrgRoleForOrg,
  isGlobalAdmin,
} from "@/domain/authorization/logic";
import type { AuthorizationService } from "@/domain/authorization/service";
import type { AuthorizationError } from "@/domain/authorization/errors";
import { AUTHORIZATION_ERROR_CODE, authorizationError } from "@/domain/authorization/errors";

/**
 * Authorization service implementation
 * Implements permission rules for all resources and actions
 */
export class AuthorizationServiceImpl implements AuthorizationService {
  isAllowed(
    actor: Actor,
    resource: Resource,
    action: Action,
  ): Result.Result<boolean, AuthorizationError> {
    const decision = this.checkPermission(actor, resource, action);
    if (Result.isFailure(decision)) {
      return decision;
    }
    return Result.succeed(decision.value.allowed);
  }

  checkPermission(
    actor: Actor,
    resource: Resource,
    action: Action,
  ): Result.Result<AuthorizationDecision, AuthorizationError> {
    // Global admins can do everything
    if (isGlobalAdmin(actor)) {
      return Result.succeed({ allowed: true, reason: "グローバル管理者" });
    }

    // Route to specific permission check based on resource type
    switch (resource.type) {
      case "event":
        return this.checkEventPermission(actor, resource, action);
      case "project":
        return this.checkProjectPermission(actor, resource, action);
      case "organization":
        return this.checkOrganizationPermission(actor, resource, action);
      case "user":
        return this.checkUserPermission(actor, resource, action);
      default:
        return Result.fail(
          authorizationError(AUTHORIZATION_ERROR_CODE.UNKNOWN_RESOURCE, "不明なリソースタイプ"),
        );
    }
  }

  enforce(
    actor: Actor,
    resource: Resource,
    action: Action,
  ): Result.Result<true, AuthorizationError> {
    const decision = this.checkPermission(actor, resource, action);
    if (Result.isFailure(decision)) {
      return decision;
    }

    if (!decision.value.allowed) {
      return Result.fail(
        authorizationError(
          AUTHORIZATION_ERROR_CODE.PERMISSION_DENIED,
          decision.value.reason ?? "この操作を実行する権限がありません",
        ),
      );
    }

    return Result.succeed(true);
  }

  private checkEventPermission(
    actor: Actor,
    resource: Extract<Resource, { type: "event" }>,
    action: Action,
  ): Result.Result<AuthorizationDecision, AuthorizationError> {
    const committeeRole = getCommitteeRoleForEvent(actor, resource.eventId);

    switch (action) {
      case "event:create":
        // Only global admins can create events (already checked above)
        return Result.succeed({
          allowed: false,
          reason: "システム管理者のみがイベントを作成できます",
        });

      case "event:read":
        // Anyone can read events (even non-committee members for public data)
        return Result.succeed({ allowed: true });

      case "event:update":
        // Event admins can modify events
        if (committeeRole === "admin") {
          return Result.succeed({ allowed: true, reason: "イベント管理者" });
        }
        return Result.succeed({
          allowed: false,
          reason: "イベント管理者のみがイベントを変更できます",
        });

      case "event:archive":
        // Only global admins can archive events (already checked above)
        return Result.succeed({
          allowed: false,
          reason: "システム管理者のみがイベントをアーカイブできます",
        });

      case "event:activate":
        // Only global admins can activate events (already checked above)
        return Result.succeed({
          allowed: false,
          reason: "システム管理者のみがイベントを有効化できます",
        });

      case "deadline:create":
      case "deadline:update":
      case "deadline:delete":
        // Only committee admins can manage deadlines
        if (committeeRole === "admin") {
          return Result.succeed({ allowed: true, reason: "委員会管理者" });
        }
        return Result.succeed({
          allowed: false,
          reason: "委員会管理者のみが締切を管理できます",
        });

      case "place:create":
      case "place:update":
      case "place:delete":
        // Only committee admins can manage places
        if (committeeRole === "admin") {
          return Result.succeed({ allowed: true, reason: "委員会管理者" });
        }
        return Result.succeed({
          allowed: false,
          reason: "委員会管理者のみが場所を管理できます",
        });

      case "tag:create":
      case "tag:update":
      case "tag:delete":
        // Only committee admins can manage tags
        if (committeeRole === "admin") {
          return Result.succeed({ allowed: true, reason: "委員会管理者" });
        }
        return Result.succeed({
          allowed: false,
          reason: "委員会管理者のみがタグを管理できます",
        });

      default:
        return Result.succeed({ allowed: false, reason: "不明なアクション" });
    }
  }

  private checkProjectPermission(
    actor: Actor,
    resource: Extract<Resource, { type: "project" }>,
    action: Action,
  ): Result.Result<AuthorizationDecision, AuthorizationError> {
    const committeeRole = getCommitteeRoleForEvent(actor, resource.eventId);
    const orgRole = getOrgRoleForOrg(actor, resource.orgId);

    switch (action) {
      case "project:create": {
        // Only committee admins can create projects
        const committeeRole = getCommitteeRoleForEvent(actor, resource.eventId);
        if (committeeRole === "admin") {
          return Result.succeed({ allowed: true, reason: "委員会管理者" });
        }
        return Result.succeed({
          allowed: false,
          reason: "委員会管理者のみがプロジェクトを作成できます",
        });
      }

      case "project:update": {
        // Only committee admins can update projects
        const committeeRole = getCommitteeRoleForEvent(actor, resource.eventId);
        if (committeeRole === "admin") {
          return Result.succeed({ allowed: true, reason: "委員会管理者" });
        }
        return Result.succeed({
          allowed: false,
          reason: "委員会管理者のみがプロジェクトを更新できます",
        });
      }

      case "project:submit":
        // Organization managers can submit projects
        if (orgRole === "manager") {
          return Result.succeed({ allowed: true, reason: "組織マネージャー" });
        }
        return Result.succeed({
          allowed: false,
          reason: "組織マネージャーのみがプロジェクトを提出できます",
        });

      case "project:approve":
      case "project:return":
        // Event admins and approvers can approve/return submissions
        if (committeeRole === "admin" || committeeRole === "approver") {
          return Result.succeed({ allowed: true, reason: "イベント承認者" });
        }
        return Result.succeed({
          allowed: false,
          reason: "イベント承認者のみがプロジェクトを承認・差し戻しできます",
        });

      case "project:read":
        // Anyone can read (public data)
        return Result.succeed({ allowed: true });

      case "project_draft:update":
        // Committee admins and organization managers/editors can update drafts
        if (committeeRole === "admin") {
          return Result.succeed({ allowed: true, reason: "委員会管理者" });
        }
        if (orgRole === "manager" || orgRole === "editor") {
          return Result.succeed({ allowed: true, reason: "組織マネージャーまたはエディター" });
        }
        return Result.succeed({
          allowed: false,
          reason: "委員会管理者または組織のメンバーのみがプロジェクト下書きを更新できます",
        });

      default:
        return Result.succeed({ allowed: false, reason: "不明なアクション" });
    }
  }

  private checkOrganizationPermission(
    actor: Actor,
    resource: Extract<Resource, { type: "organization" }>,
    action: Action,
  ): Result.Result<AuthorizationDecision, AuthorizationError> {
    const orgRole = getOrgRoleForOrg(actor, resource.orgId);

    switch (action) {
      case "organization:create":
      case "organization:update":
      case "organization:delete": {
        // Only committee admins can create/update/delete organizations
        const committeeRole = getCommitteeRoleForEvent(actor, resource.eventId);
        if (committeeRole === "admin") {
          return Result.succeed({ allowed: true, reason: "委員会管理者" });
        }
        return Result.succeed({
          allowed: false,
          reason: "委員会管理者のみがこの操作を実行できます",
        });
      }

      case "organization:read":
        // Anyone can read organizations
        return Result.succeed({ allowed: true });

      case "organization:manage_members": {
        // Committee admins and organization managers can manage members
        const committeeRoleForMembers = getCommitteeRoleForEvent(actor, resource.eventId);
        if (committeeRoleForMembers === "admin") {
          return Result.succeed({ allowed: true, reason: "委員会管理者" });
        }
        if (orgRole === "manager") {
          return Result.succeed({ allowed: true, reason: "組織マネージャー" });
        }
        return Result.succeed({
          allowed: false,
          reason: "委員会管理者または組織マネージャーのみがメンバーを管理できます",
        });
      }

      default:
        return Result.succeed({ allowed: false, reason: "不明なアクション" });
    }
  }

  private checkUserPermission(
    _actor: Actor,
    _resource: Extract<Resource, { type: "user" }>,
    action: Action,
  ): Result.Result<AuthorizationDecision, AuthorizationError> {
    switch (action) {
      case "user:update_role":
        // Only global admins can update user roles (already checked at top of checkPermission)
        return Result.succeed({
          allowed: false,
          reason: "グローバル管理者のみがユーザーのロールを更新できます",
        });

      default:
        return Result.succeed({ allowed: false, reason: "不明なアクション" });
    }
  }
}
