/**
 * Authorization service
 * Implements permission rules for all resources and actions
 */

import { Result } from "@akabase/result";
import type { Action, Actor, AuthorizationDecision, Resource } from "./schema";
import { getCommitteeRoleForEvent, getOrgRoleForOrg, isGlobalAdmin } from "./logic";
import { AUTHORIZATION_ERROR_CODE, authorizationError } from "./errors";
import type { AuthorizationError } from "./errors";

export class AuthorizationService {
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

  // oxlint-disable-next-line class-methods-use-this
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
      case "event": {
        return AuthorizationService.checkEventPermission(actor, resource, action);
      }
      case "project": {
        return AuthorizationService.checkProjectPermission(actor, resource, action);
      }
      case "organization": {
        return AuthorizationService.checkOrganizationPermission(actor, resource, action);
      }
      case "user": {
        return AuthorizationService.checkUserPermission(actor, resource, action);
      }
      default: {
        return Result.fail(
          authorizationError(AUTHORIZATION_ERROR_CODE.UNKNOWN_RESOURCE, "不明なリソースタイプ"),
        );
      }
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

  private static checkEventPermission(
    actor: Actor,
    resource: Extract<Resource, { type: "event" }>,
    action: Action,
  ): Result.Result<AuthorizationDecision, AuthorizationError> {
    const committeeRole = getCommitteeRoleForEvent(actor, resource.eventId);

    switch (action) {
      case "event:create": {
        return Result.succeed({
          allowed: false,
          reason: "システム管理者のみがイベントを作成できます",
        });
      }

      case "event:read": {
        return Result.succeed({ allowed: true });
      }

      case "event:update": {
        if (committeeRole === "admin") {
          return Result.succeed({ allowed: true, reason: "イベント管理者" });
        }
        return Result.succeed({
          allowed: false,
          reason: "イベント管理者のみがイベントを変更できます",
        });
      }

      case "event:archive": {
        return Result.succeed({
          allowed: false,
          reason: "システム管理者のみがイベントをアーカイブできます",
        });
      }

      case "event:activate": {
        return Result.succeed({
          allowed: false,
          reason: "システム管理者のみがイベントを有効化できます",
        });
      }

      case "user:list_for_event": {
        if (
          committeeRole === "admin" ||
          committeeRole === "approver" ||
          committeeRole === "member"
        ) {
          return Result.succeed({ allowed: true, reason: "委員会メンバー" });
        }
        return Result.succeed({
          allowed: false,
          reason: "委員会メンバーのみがユーザー一覧を閲覧できます",
        });
      }

      case "event:list_submissions": {
        if (
          committeeRole === "admin" ||
          committeeRole === "approver" ||
          committeeRole === "member"
        ) {
          return Result.succeed({ allowed: true, reason: "委員会メンバー" });
        }
        return Result.succeed({
          allowed: false,
          reason: "委員会メンバーのみが企画提出一覧を閲覧できます",
        });
      }

      default: {
        return Result.succeed({ allowed: false, reason: "不明なアクション" });
      }
    }
  }

  // oxlint-disable-next-line complexity max-statements
  private static checkProjectPermission(
    actor: Actor,
    resource: Extract<Resource, { type: "project" }>,
    action: Action,
  ): Result.Result<AuthorizationDecision, AuthorizationError> {
    const committeeRole = getCommitteeRoleForEvent(actor, resource.eventId);
    const orgRole = getOrgRoleForOrg(actor, resource.orgId);

    switch (action) {
      case "project:create": {
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
        const committeeRole = getCommitteeRoleForEvent(actor, resource.eventId);
        if (committeeRole === "admin") {
          return Result.succeed({ allowed: true, reason: "委員会管理者" });
        }
        return Result.succeed({
          allowed: false,
          reason: "委員会管理者のみがプロジェクトを更新できます",
        });
      }

      case "project:submit": {
        if (orgRole === "manager") {
          return Result.succeed({ allowed: true, reason: "出展団体マネージャー" });
        }
        return Result.succeed({
          allowed: false,
          reason: "出展団体マネージャーのみがプロジェクトを提出できます",
        });
      }

      case "project:withdraw": {
        if (orgRole === "manager") {
          return Result.succeed({ allowed: true, reason: "出展団体マネージャー" });
        }
        return Result.succeed({
          allowed: false,
          reason: "出展団体マネージャーのみが企画提出を取り下げできます",
        });
      }

      case "project:approve":
      case "project:return": {
        if (committeeRole === "admin" || committeeRole === "approver") {
          return Result.succeed({ allowed: true, reason: "イベント承認者" });
        }
        return Result.succeed({
          allowed: false,
          reason: "イベント承認者のみがプロジェクトを承認・差し戻しできます",
        });
      }

      case "project:read": {
        if (committeeRole === "admin") {
          return Result.succeed({ allowed: true, reason: "委員会管理者" });
        }
        if (orgRole === "manager" || orgRole === "editor") {
          return Result.succeed({ allowed: true, reason: "出展団体マネージャーまたはエディター" });
        }
        return Result.succeed({
          allowed: false,
          reason: "委員会管理者または出展団体のメンバーのみがプロジェクトを閲覧できます",
        });
      }

      case "project:update_draft": {
        if (committeeRole === "admin") {
          return Result.succeed({ allowed: true, reason: "委員会管理者" });
        }
        if (orgRole === "manager" || orgRole === "editor") {
          return Result.succeed({ allowed: true, reason: "出展団体マネージャーまたはエディター" });
        }
        return Result.succeed({
          allowed: false,
          reason: "委員会管理者または出展団体のメンバーのみがプロジェクト下書きを更新できます",
        });
      }

      default: {
        return Result.succeed({ allowed: false, reason: "不明なアクション" });
      }
    }
  }

  private static checkOrganizationPermission(
    actor: Actor,
    resource: Extract<Resource, { type: "organization" }>,
    action: Action,
  ): Result.Result<AuthorizationDecision, AuthorizationError> {
    const orgRole = getOrgRoleForOrg(actor, resource.orgId);

    switch (action) {
      case "organization:create":
      case "organization:update":
      case "organization:delete": {
        const committeeRole = getCommitteeRoleForEvent(actor, resource.eventId);
        if (committeeRole === "admin") {
          return Result.succeed({ allowed: true, reason: "委員会管理者" });
        }
        return Result.succeed({
          allowed: false,
          reason: "委員会管理者のみがこの操作を実行できます",
        });
      }

      case "organization:read": {
        const committeeRole = getCommitteeRoleForEvent(actor, resource.eventId);
        if (
          committeeRole === "admin" ||
          committeeRole === "approver" ||
          committeeRole === "member"
        ) {
          return Result.succeed({ allowed: true, reason: "委員会メンバー" });
        }
        if (orgRole !== null) {
          return Result.succeed({ allowed: true, reason: "出展団体メンバー" });
        }
        return Result.succeed({
          allowed: false,
          reason: "委員会メンバーまたは出展団体メンバーのみが出展団体情報を閲覧できます",
        });
      }

      case "organization:manage_members": {
        const committeeRole = getCommitteeRoleForEvent(actor, resource.eventId);
        if (committeeRole === "admin") {
          return Result.succeed({ allowed: true, reason: "委員会管理者" });
        }
        if (orgRole === "manager") {
          return Result.succeed({ allowed: true, reason: "出展団体マネージャー" });
        }
        return Result.succeed({
          allowed: false,
          reason: "委員会管理者または出展団体マネージャーのみがメンバーを管理できます",
        });
      }

      default: {
        return Result.succeed({ allowed: false, reason: "不明なアクション" });
      }
    }
  }

  private static checkUserPermission(
    _actor: Actor,
    _resource: Extract<Resource, { type: "user" }>,
    action: Action,
  ): Result.Result<AuthorizationDecision, AuthorizationError> {
    switch (action) {
      case "user:update_role": {
        return Result.succeed({
          allowed: false,
          reason: "グローバル管理者のみがユーザーのロールを更新できます",
        });
      }

      case "user:list": {
        return Result.succeed({
          allowed: false,
          reason: "グローバル管理者のみが全ユーザー一覧を閲覧できます",
        });
      }

      default: {
        return Result.succeed({ allowed: false, reason: "不明なアクション" });
      }
    }
  }
}
