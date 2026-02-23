/**
 * User domain schema
 * Type definitions for user entities and committee role assignments
 */

import { z } from "zod";
import { eventIdSchema, userIdSchema } from "@/domain/shared/ids";
import { committeeRoleSchema, globalRoleSchema } from "@/domain/authorization/schema";

/**
 * Schema constraints
 */
export const USER_NAME_MIN_LENGTH = 1;
export const USER_NAME_MAX_LENGTH = 100;

/**
 * User entity schema
 */
export const userSchema = z.object({
  id: userIdSchema,
  name: z
    .string()
    .min(USER_NAME_MIN_LENGTH, "ユーザー名を入力してください")
    .max(USER_NAME_MAX_LENGTH, "ユーザー名は100文字以内で入力してください"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  role: globalRoleSchema, // Global role
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof userSchema>;

/**
 * Committee role assignment schema
 * Represents a user's role within a specific event
 */
export const committeeRoleAssignmentSchema = z.object({
  id: z.string(),
  eventId: eventIdSchema,
  userId: userIdSchema,
  role: committeeRoleSchema,
  createdAt: z.date(),
});

export type CommitteeRoleAssignment = z.infer<typeof committeeRoleAssignmentSchema>;
