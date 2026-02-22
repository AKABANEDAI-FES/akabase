/**
 * Authorization service implementation
 * Implements permission rules for all resources and actions
 */

import { Result } from "@praha/byethrow";
import type { Actor } from "@/domain/authorization/actor";
import {
  getCommitteeRoleForEvent,
  getOrgRoleForOrg,
  isGlobalAdmin,
} from "@/domain/authorization/actor";
import type { Action, Resource } from "@/domain/authorization/resource";
import type { AuthorizationDecision, AuthorizationService } from "@/domain/authorization/service";
import type { AuthorizationError } from "@/domain/authorization/errors";
import { authorizationError } from "@/domain/authorization/errors";

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
      default:
        return Result.fail(authorizationError("UNKNOWN_RESOURCE", "不明なリソースタイプ"));
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
          "PERMISSION_DENIED",
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
      case "event:archive":
      case "event:activate":
        // Event admins can modify events
        if (committeeRole === "admin") {
          return Result.succeed({ allowed: true, reason: "イベント管理者" });
        }
        return Result.succeed({
          allowed: false,
          reason: "イベント管理者のみがイベントを変更できます",
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
      case "project:create":
      case "project:update":
        // Organization managers and editors can create/update projects
        if (orgRole === "manager" || orgRole === "editor") {
          return Result.succeed({ allowed: true, reason: "組織メンバー" });
        }
        return Result.succeed({
          allowed: false,
          reason: "組織メンバーのみがプロジェクトを作成・更新できます",
        });

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
        // Any authenticated user can create organizations
        return Result.succeed({ allowed: true });

      case "organization:read":
        // Anyone can read organizations
        return Result.succeed({ allowed: true });

      case "organization:update":
        // Organization members can update
        if (orgRole === "manager" || orgRole === "editor") {
          return Result.succeed({ allowed: true, reason: "組織メンバー" });
        }
        return Result.succeed({
          allowed: false,
          reason: "組織メンバーのみが組織情報を更新できます",
        });

      case "organization:manage_members":
        // Only managers can manage members
        if (orgRole === "manager") {
          return Result.succeed({ allowed: true, reason: "組織マネージャー" });
        }
        return Result.succeed({
          allowed: false,
          reason: "組織マネージャーのみがメンバーを管理できます",
        });

      default:
        return Result.succeed({ allowed: false, reason: "不明なアクション" });
    }
  }
}
