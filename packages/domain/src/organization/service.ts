import type { Result } from "@archive/result";
import type { OrgId, OrgMember } from "./schema";
import type { UserId } from "../user/schema";
import type { OrganizationError } from "./errors";

/**
 * Organization Domain Service Interface
 * I/Oが必要なビジネスルールを定義する
 * 実装はインフラ層で提供（OrganizationDomainServiceImpl）
 */
export type OrganizationDomainService = {
  /**
   * メンバー追加可能であることを保証する
   * Rule: 既にメンバーでないこと
   */
  ensureCanAddMember(orgId: OrgId, userId: UserId): Promise<Result.Result<true, OrganizationError>>;

  /**
   * メンバー削除可能であることを保証する
   * Rule: メンバーであること
   */
  ensureCanRemoveMember(
    orgId: OrgId,
    userId: UserId,
  ): Promise<Result.Result<true, OrganizationError>>;

  /**
   * メンバーが存在することを保証し、メンバーを返す
   */
  ensureMemberExists(
    orgId: OrgId,
    userId: UserId,
  ): Promise<Result.Result<OrgMember, OrganizationError>>;
};
