import type { Result } from "@akabase/result";
import type { EventId } from "../event/schema";
import type { UserId } from "../user/schema";
import type { ProjectId, SubmissionId } from "./schema";
import type { ProjectError } from "./errors";

/**
 * Project Domain Service Interface
 * I/Oが必要なビジネスルールを定義する
 * 実装はインフラ層で提供（ProjectDomainServiceImpl）
 */
export type ProjectDomainService = {
  /**
   * 提出可能かチェック
   * - 既に有効な提出（status='submitted'）が存在しないことを確認
   *
   * @param projectId - チェック対象のプロジェクトID
   * @returns 提出可能ならtrue、既に提出済みならALREADY_SUBMITTEDエラー
   */
  canSubmit(projectId: ProjectId): Promise<Result.Result<true, ProjectError>>;

  /**
   * 同じユーザーが既に承認していないことを確認（重複承認チェック）
   *
   * @param submissionId - チェック対象のsubmissionId
   * @param userId - 承認しようとしているユーザーID
   * @returns 重複していなければtrue、既に承認済みならCANNOT_APPROVEエラー
   */
  ensureUserNotApproved(
    submissionId: SubmissionId,
    userId: UserId,
  ): Promise<Result.Result<true, ProjectError>>;

  /**
   * コンテスト投票番号の一意性を保証する（イベント内）
   *
   * @param eventId - 対象イベントID
   * @param contestVoteNumber - チェック対象の投票番号
   * @param excludeProjectId - 除外するプロジェクトID（更新時に自身を除外する用途）
   * @returns 一意であれば成功、重複があればCONTEST_VOTE_NUMBER_NOT_UNIQUEエラー
   */
  ensureContestVoteNumberUnique(
    eventId: EventId,
    contestVoteNumber: string,
    excludeProjectId?: ProjectId,
  ): Promise<Result.Result<true, ProjectError>>;
};
