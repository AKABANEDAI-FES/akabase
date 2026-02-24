import type { Result } from "@praha/byethrow";
import type { OrgId, UserId } from "@/domain/shared/ids";
import type { OrgMember } from "./schema";
import type { OrganizationError } from "./errors";
import type { RepositoryError } from "../shared/repository";

/**
 * Organization Domain Service Interface
 * I/Oが必要なビジネスルールを定義する
 * 実装はインフラ層で提供（OrganizationDomainServiceImpl）
 */
export interface OrganizationDomainService {
  /**
   * メンバー追加可能であることを保証する
   * Rule: 既にメンバーでないこと
   */
  ensureCanAddMember(
    orgId: OrgId,
    userId: UserId,
  ): Promise<Result.Result<true, OrganizationError | RepositoryError>>;

  /**
   * メンバー削除可能であることを保証する
   * Rule: メンバーであること
   */
  ensureCanRemoveMember(
    orgId: OrgId,
    userId: UserId,
  ): Promise<Result.Result<true, OrganizationError | RepositoryError>>;

  /**
   * メンバーが存在することを保証し、メンバーを返す
   */
  ensureMemberExists(
    orgId: OrgId,
    userId: UserId,
  ): Promise<Result.Result<OrgMember, OrganizationError | RepositoryError>>;
}
