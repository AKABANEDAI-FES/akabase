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
  canReturn,
  createReturnedActionEntity,
  createSubmissionMessageEntity,
} from "@/domain/project/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Input for returning a submission
 */
export type ReturnProjectInput = {
  submissionId: SubmissionId;
  actor: Actor;
  reason: string; // 差し戻し理由（必須）
};

/**
 * Output of return submission
 */
export type ReturnProjectOutput = {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
  submissionId: SubmissionId;
};

/**
 * Errors that can occur during return
 */
export type ReturnProjectError = ProjectError | EventError | AuthorizationError;

/**
 * 提出を差し戻す（Submission status: submitted → returned）
 *
 * ビジネスルール：
 * - 委員会admin/approverのみ実行可能
 * - status='submitted' のときのみ差し戻し可能
 * - approved/withdrawn/returned は差し戻し不可
 * - イベントが編集可能（アーカイブ済みでない）必要あり
 * - submission.status を 'returned' に更新
 * - submission_actions に actionType='returned' を記録
 * - submission_messages に差し戻し理由を記録（actionId と紐付け）
 *
 * @param deps - Dependencies (projectRepo, authService, eventDomainService)
 * @param input - Return input with submissionId and reason
 * @returns Result with submission details or error
 */
export async function returnProject(
  deps: Pick<Dependencies, "projectRepo" | "authService" | "eventDomainService">,
  input: ReturnProjectInput,
): Result.ResultAsync<ReturnProjectOutput, ReturnProjectError> {
  return gen(async function* ($) {
    // 提出を取得して現在の状態を検証
    const submission = await deps.projectRepo.findSubmissionById(input.submissionId);
    if (!submission) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.SUBMISSION_NOT_FOUND, "提出が見つかりません")),
      );
    }

    // ドメインロジック: 差し戻し可能かチェック
    yield* $(canReturn(submission));

    // 企画を取得して eventId と orgId を取得（認可用）
    const project = await deps.projectRepo.findById(submission.projectId);
    if (!project) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.PROJECT_NOT_FOUND, "企画が見つかりません")),
      );
    }

    // 認可チェック: 委員会 admin/approver のみ差し戻し可能
    const resource = projectResource(project.id, project.eventId, project.orgId);
    yield* $(deps.authService.enforce(input.actor, resource, "project:return"));

    // イベントが編集可能かチェック（アーカイブ済みでない）
    yield* $(await deps.eventDomainService.resolveModifiableEvent(project.eventId));

    // ID生成
    const actionId = generateId<SubmissionActionId>();
    const messageId = generateId<SubmissionMessageId>();

    // 差し戻しアクションエンティティを作成
    const returnAction = yield* $(
      createReturnedActionEntity({
        actionId,
        submissionId: input.submissionId,
        userId: input.actor.userId,
      }),
    );

    // 差し戻し理由メッセージエンティティを作成
    const returnMessage = yield* $(
      createSubmissionMessageEntity({
        messageId,
        submissionId: input.submissionId,
        actionId: actionId,
        userId: input.actor.userId,
        message: input.reason,
      }),
    );

    // submission.status を 'returned' に更新
    const updatedSubmission = {
      ...submission,
      status: "returned" as const,
    };

    // 変更を永続化（トランザクション内でアトミックに実行）
    await deps.projectRepo.returnWithTransaction({
      updatedSubmission,
      returnAction,
      returnMessage,
    });

    return {
      eventId: project.eventId,
      orgId: project.orgId,
      projectId: project.id,
      submissionId: submission.id,
    };
  });
}
