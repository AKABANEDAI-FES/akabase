import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import { generateId } from "@/libs/id";
import type {
  EventId,
  OrgId,
  ProjectId,
  SubmissionActionId,
  SubmissionId,
  SubmissionMessageId,
} from "@/domain/shared/ids";
import type { ProjectError } from "@/domain/project/errors";
import { PROJECT_ERROR_CODE, projectError } from "@/domain/project/errors";
import type { EventError } from "@/domain/event/errors";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { projectResource } from "@/domain/authorization/logic";
import {
  canWithdraw,
  createSubmissionMessageEntity,
  createWithdrawnActionEntity,
} from "@/domain/project/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Input for withdrawing a submission
 */
export type WithdrawSubmissionInput = {
  submissionId: SubmissionId;
  actor: Actor;
  reason?: string; // 取り下げ理由（任意）
};

/**
 * Output of withdraw submission
 */
export type WithdrawSubmissionOutput = {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
  submissionId: SubmissionId;
};

/**
 * Errors that can occur during withdrawal
 */
export type WithdrawSubmissionError = ProjectError | EventError | AuthorizationError;

/**
 * 提出を取り下げる（Submission status: submitted → withdrawn）
 *
 * ビジネスルール：
 * - 団体マネージャーのみ実行可能
 * - status='submitted' のときのみ取り下げ可能
 * - approved/returned/withdrawn は取り下げ不可
 * - イベントが編集可能（アーカイブ済みでない）必要あり
 * - submission.status を 'withdrawn' に更新
 * - submission_actions に actionType='withdrawn' を記録
 * - 任意で submission_messages に取り下げ理由を記録（actionId と紐付け）
 *
 * @param deps - Dependencies (projectRepo, authService, eventDomainService)
 * @param input - Withdrawal input with submissionId and optional reason
 * @returns Result with submission details or error
 */
export async function withdrawSubmission(
  deps: Pick<Dependencies, "projectRepo" | "authService" | "eventDomainService">,
  input: WithdrawSubmissionInput,
): Result.ResultAsync<WithdrawSubmissionOutput, WithdrawSubmissionError> {
  return gen(async function* ($) {
    // 提出を取得して現在の状態を検証
    const submission = await deps.projectRepo.findSubmissionById(input.submissionId);
    if (!submission) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.SUBMISSION_NOT_FOUND, "提出が見つかりません")),
      );
    }

    // ドメインロジック: 取り下げ可能かチェック
    yield* $(canWithdraw(submission));

    // 企画を取得して eventId と orgId を取得（認可用）
    const project = await deps.projectRepo.findById(submission.projectId);
    if (!project) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.PROJECT_NOT_FOUND, "企画が見つかりません")),
      );
    }

    // 認可チェック: 団体マネージャーのみ取り下げ可能
    const resource = projectResource(project.id, project.eventId, project.orgId);
    yield* $(deps.authService.enforce(input.actor, resource, "project:withdraw"));

    // イベントが編集可能かチェック（アーカイブ済みでない）
    yield* $(await deps.eventDomainService.resolveModifiableEvent(project.eventId));

    // ID生成
    const actionId = generateId<SubmissionActionId>();
    const messageId = input.reason ? generateId<SubmissionMessageId>() : null;

    // 取り下げアクションエンティティを作成
    const withdrawalAction = yield* $(
      createWithdrawnActionEntity({
        actionId,
        submissionId: input.submissionId,
        userId: input.actor.userId,
      }),
    );

    // 取り下げ理由メッセージエンティティを作成（任意）
    let withdrawalMessage = undefined;
    if (input.reason && messageId) {
      withdrawalMessage = yield* $(
        createSubmissionMessageEntity({
          messageId,
          submissionId: input.submissionId,
          actionId: actionId,
          userId: input.actor.userId,
          message: input.reason,
        }),
      );
    }

    // submission.status を 'withdrawn' に更新
    const updatedSubmission = {
      ...submission,
      status: "withdrawn" as const,
    };

    // 変更を永続化（トランザクション内でアトミックに実行）
    await deps.projectRepo.withdrawWithTransaction({
      updatedSubmission,
      withdrawalAction,
      withdrawalMessage,
    });

    return {
      eventId: project.eventId,
      orgId: project.orgId,
      projectId: project.id,
      submissionId: submission.id,
    };
  });
}
