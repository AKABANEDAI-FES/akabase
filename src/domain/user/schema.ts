/**
 * User domain schema
 * Type definitions for user entities and committee role assignments
 */

import { z } from "zod";
import type { EventId, UserId } from "@/domain/shared/ids";
import { globalRoleSchema } from "@/domain/authorization/schema";
import type { CommitteeRole } from "@/domain/authorization/schema";

/**
 * User entity schema
 */
export const userSchema = z.object({
  id: z.custom<UserId>(),
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
  eventId: z.custom<EventId>(),
  userId: z.custom<UserId>(),
  role: z.custom<CommitteeRole>(),
  createdAt: z.date(),
});

export type CommitteeRoleAssignment = z.infer<typeof committeeRoleAssignmentSchema>;
