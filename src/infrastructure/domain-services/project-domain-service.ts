import { Result } from "@praha/byethrow";
import type { ProjectDomainService } from "@/domain/project/service";
import type { ProjectRepository } from "@/domain/project/repository";
import type { ProjectId, SubmissionId, UserId } from "@/domain/shared/ids";
import { PROJECT_ERROR_CODE, projectError } from "@/domain/project/errors";

export class ProjectDomainServiceImpl implements ProjectDomainService {
  constructor(private readonly projectRepo: ProjectRepository) {}

  async canSubmit(projectId: ProjectId) {
    const submissions = await this.projectRepo.listSubmissionsByProject(projectId);

    const activeSubmission = submissions.find((s) => s.status === "submitted");

    if (activeSubmission) {
      return Result.fail(
        projectError(
          PROJECT_ERROR_CODE.ALREADY_SUBMITTED,
          "既に提出済みの企画があります。提出を取り下げるか、承認されるのをお待ちください。",
        ),
      );
    }

    return Result.succeed(true);
  }

  async canApprove(submissionId: SubmissionId, userId: UserId) {
    // 1. Fetch submission to check status
    const submission = await this.projectRepo.findSubmissionById(submissionId);

    if (!submission) {
      return Result.fail(
        projectError(PROJECT_ERROR_CODE.SUBMISSION_NOT_FOUND, "提出データが見つかりません"),
      );
    }

    // 2. Check status is 'submitted'
    if (submission.status !== "submitted") {
      return Result.fail(
        projectError(
          PROJECT_ERROR_CODE.INVALID_STATUS,
          `この提出は承認できません。現在のステータス: ${submission.status}`,
        ),
      );
    }

    // 3. Check if user already approved
    const existingApproval = await this.projectRepo.findApprovalAction(submissionId, userId);

    if (existingApproval) {
      return Result.fail(
        projectError(PROJECT_ERROR_CODE.CANNOT_APPROVE, "既にこの提出を承認しています"),
      );
    }

    return Result.succeed(true);
  }
}
