import type { Result } from "@praha/byethrow";
import type { ProjectId, SubmissionId, UserId } from "@/domain/shared/ids";
import type { ProjectError } from "./errors";

/**
 * Project Domain Service Interface
 * I/Oが必要なビジネスルールを定義する
 * 実装はインフラ層で提供（ProjectDomainServiceImpl）
 */
export interface ProjectDomainService {
  /**
   * 提出可能かチェック
   * - 既に有効な提出（status='submitted'）が存在しないことを確認
   *
   * @param projectId - チェック対象のプロジェクトID
   * @returns 提出可能ならtrue、既に提出済みならALREADY_SUBMITTEDエラー
   */
  canSubmit(projectId: ProjectId): Promise<Result.Result<true, ProjectError>>;

  /**
   * 承認可能かチェック
   * - 提出のステータスが 'submitted' であることを確認
   * - 同じユーザーが既に承認していないことを確認
   *
   * @param submissionId - チェック対象のsubmissionId
   * @param userId - 承認しようとしているユーザーID
   * @returns 承認可能ならtrue、不可能ならエラー
   */
  canApprove(
    submissionId: SubmissionId,
    userId: UserId,
  ): Promise<Result.Result<true, ProjectError>>;
}
