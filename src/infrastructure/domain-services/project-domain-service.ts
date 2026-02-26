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

  async ensureUserNotApproved(submissionId: SubmissionId, userId: UserId) {
    // Check if user already approved (duplicate check)
    const existingApproval = await this.projectRepo.findApprovalAction(submissionId, userId);

    if (existingApproval) {
      return Result.fail(
        projectError(PROJECT_ERROR_CODE.CANNOT_APPROVE, "既にこの提出を承認しています"),
      );
    }

    return Result.succeed(true);
  }
}
