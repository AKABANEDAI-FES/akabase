import { Result } from "@praha/byethrow";
import { gen, suspend } from "@/libs/result";
import { generateId } from "@/libs/id";
import type { ProjectId, SubmissionId, UserId } from "@/domain/shared/ids";
import type { ProjectError } from "@/domain/project/errors";
import type { RepositoryError } from "@/infrastructure/repositories/interfaces";
import { canSubmit, createSubmissionFromDraft, projectAfterSubmit } from "@/domain/project/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Submit Project Input
 */
export type SubmitProjectInput = {
  projectId: ProjectId;
  userId: UserId;
};

/**
 * Submit Project Output
 */
export type SubmitProjectOutput = {
  submissionId: SubmissionId;
};

/**
 * Submit Project Error
 */
export type SubmitProjectError = ProjectError | RepositoryError;

/**
 * Submit Project Use Case
 *
 * Workflow:
 * 1. Load project from repository
 * 2. Load draft from repository
 * 3. Check if project can be submitted (domain logic)
 * 4. Create submission snapshot from draft (domain logic)
 * 5. Update project with active submission ID (domain logic)
 * 6. Persist submission to repository
 * 7. Update project in repository
 *
 * This use case demonstrates:
 * - Generator-based error handling with Result type
 * - Pure domain logic (canSubmit, createSubmissionFromDraft)
 * - Dependency injection (repositories passed as deps)
 * - Clean separation: Domain logic is pure, side effects in repositories
 */
export function submitProject(
  deps: Dependencies,
  input: SubmitProjectInput,
): Result.ResultAsync<SubmitProjectOutput, SubmitProjectError> {
  return suspend(() =>
    gen(async function* ($) {
      // 1. Load project from repository
      const projectResult = yield* $(await deps.projectRepo.findById(input.projectId));

      if (!projectResult) {
        return yield* $(
          Result.fail({
            code: "PROJECT_NOT_FOUND" as const,
            message: "企画が見つかりません。",
          }),
        );
      }

      // 2. Load draft from repository
      const draftResult = yield* $(await deps.projectRepo.findDraftWithTags(input.projectId));

      if (!draftResult) {
        return yield* $(
          Result.fail({
            code: "DRAFT_NOT_FOUND" as const,
            message: "下書きが見つかりません。",
          }),
        );
      }

      // 3. Check if project can be submitted (domain logic - pure function)
      yield* $(canSubmit(projectResult));

      // 4. Create submission snapshot from draft (domain logic - pure function)
      const submissionId = generateId() as SubmissionId;
      const submission = createSubmissionFromDraft(draftResult, input.userId, submissionId);

      // 5. Update project with active submission ID (domain logic - pure function)
      const updatedProject = projectAfterSubmit(projectResult, submissionId);

      // 6. Persist submission to repository
      yield* $(await deps.projectRepo.saveSubmissionWithTags(submission));

      // 7. Update project in repository
      yield* $(await deps.projectRepo.updateProject(updatedProject));

      // Return success with submission ID
      return { submissionId };
    }),
  );
}
