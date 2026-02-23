/**
 * User domain schema
 * Type definitions for user entities and committee role assignments
 */

import { z } from "zod";
import { eventIdSchema, userIdSchema } from "@/domain/shared/ids";
import { committeeRoleSchema, globalRoleSchema } from "@/domain/authorization/schema";

/**
 * User entity schema
 */
export const userSchema = z.object({
  id: userIdSchema,
  name: z.string(),
  email: z.email(),
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
