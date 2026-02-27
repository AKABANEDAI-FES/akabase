import { z } from "zod";

/**
 * Brand type IDs to prevent mixing different ID types at compile time
 *
 * Example:
 *   function submitProject(projectId: ProjectId) { ... }
 *   submitProject(orgId); // ❌ Compile error!
 */

export const projectIdSchema = z.string().brand<"ProjectId">();
export type ProjectId = z.infer<typeof projectIdSchema>;

export const orgIdSchema = z.string().brand<"OrgId">();
export type OrgId = z.infer<typeof orgIdSchema>;

export const eventIdSchema = z.string().brand<"EventId">();
export type EventId = z.infer<typeof eventIdSchema>;

export const submissionIdSchema = z.string().brand<"SubmissionId">();
export type SubmissionId = z.infer<typeof submissionIdSchema>;

export const userIdSchema = z.string().brand<"UserId">();
export type UserId = z.infer<typeof userIdSchema>;

export const tagIdSchema = z.string().brand<"TagId">();
export type TagId = z.infer<typeof tagIdSchema>;

export const placeIdSchema = z.string().brand<"PlaceId">();
export type PlaceId = z.infer<typeof placeIdSchema>;

export const deadlineIdSchema = z.string().brand<"DeadlineId">();
export type DeadlineId = z.infer<typeof deadlineIdSchema>;

export const submissionMessageIdSchema = z.string().brand<"SubmissionMessageId">();
export type SubmissionMessageId = z.infer<typeof submissionMessageIdSchema>;

export const submissionActionIdSchema = z.string().brand<"SubmissionActionId">();
export type SubmissionActionId = z.infer<typeof submissionActionIdSchema>;

export const imageIdSchema = z.string().brand<"ImageId">();
export type ImageId = z.infer<typeof imageIdSchema>;

export function cast<T extends string>(id: string): T {
  return z.string().parse(id) as T;
}
