import { Result } from "@akabase/result";
import type { ProjectDomainService } from "@akabase/domain/project/service";
import type { ProjectRepository } from "@akabase/domain/project/repository";
import type { EventId } from "@akabase/domain/event/schema";
import type { ProjectId, SubmissionId } from "@akabase/domain/project/schema";
import type { UserId } from "@akabase/domain/user/schema";
import { PROJECT_ERROR_CODE, projectError } from "@akabase/domain/project/errors";

export class ProjectDomainServiceImpl implements ProjectDomainService {
  private readonly projectRepo: ProjectRepository;

  constructor(projectRepo: ProjectRepository) {
    this.projectRepo = projectRepo;
  }

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

  async ensureContestVoteNumberUnique(
    eventId: EventId,
    contestVoteNumber: number,
    excludeProjectId?: ProjectId,
  ) {
    const project = await this.projectRepo.findByEventAndContestVoteNumber(
      eventId,
      contestVoteNumber,
    );

    if (project !== null && project.id !== excludeProjectId) {
      return Result.fail(
        projectError(
          PROJECT_ERROR_CODE.CONTEST_VOTE_NUMBER_NOT_UNIQUE,
          "この投票番号は既に使用されています",
        ),
      );
    }

    return Result.succeed(true);
  }
}
