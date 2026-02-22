import { db } from "@/db";
import { committeeRoles, orgMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Committee Role Permissions (per event)
 */

export async function getCommitteeRole(
  userId: string,
  eventId: string,
): Promise<"admin" | "approver" | "member" | "default" | null> {
  const result = await db
    .select({ role: committeeRoles.role })
    .from(committeeRoles)
    .where(and(eq(committeeRoles.userId, userId), eq(committeeRoles.eventId, eventId)))
    .get();

  return result?.role ?? null;
}

export async function isAdmin(userId: string, eventId: string): Promise<boolean> {
  const role = await getCommitteeRole(userId, eventId);
  return role === "admin";
}

export async function isApprover(userId: string, eventId: string): Promise<boolean> {
  const role = await getCommitteeRole(userId, eventId);
  return role === "admin" || role === "approver";
}

export async function isMember(userId: string, eventId: string): Promise<boolean> {
  const role = await getCommitteeRole(userId, eventId);
  return role !== null; // Any role means member
}

/**
 * Organization Role Permissions (per organization)
 */

export async function getOrgRole(
  userId: string,
  orgId: string,
): Promise<"manager" | "editor" | null> {
  const result = await db
    .select({ role: orgMembers.role })
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, userId), eq(orgMembers.orgId, orgId)))
    .get();

  return result?.role ?? null;
}

export async function isOrgManager(userId: string, orgId: string): Promise<boolean> {
  const role = await getOrgRole(userId, orgId);
  return role === "manager";
}

export async function isOrgEditor(userId: string, orgId: string): Promise<boolean> {
  const role = await getOrgRole(userId, orgId);
  return role === "manager" || role === "editor";
}

export async function isOrgMember(userId: string, orgId: string): Promise<boolean> {
  const role = await getOrgRole(userId, orgId);
  return role !== null;
}
