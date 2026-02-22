/**
 * Authorization service interface
 */

import type { Result } from "@praha/byethrow";
import type { Actor } from "./actor";
import type { Action, Resource } from "./resource";
import type { AuthorizationError } from "./errors";

/**
 * Authorization decision with optional reason
 */
export type AuthorizationDecision = {
  allowed: boolean;
  reason?: string; // Optional explanation for denial
};

/**
 * Authorization service interface
 * Core interface: isAllowed(actor, resource, action)
 */
export interface AuthorizationService {
  /**
   * Check if an actor is allowed to perform an action on a resource
   *
   * @param actor - The actor attempting the action
   * @param resource - The resource being accessed
   * @param action - The action being performed
   * @returns Result with boolean indicating permission
   */
  isAllowed(
    actor: Actor,
    resource: Resource,
    action: Action,
  ): Result.Result<boolean, AuthorizationError>;

  /**
   * Check permission with detailed decision information
   *
   * @param actor - The actor attempting the action
   * @param resource - The resource being accessed
   * @param action - The action being performed
   * @returns Result with authorization decision including reason
   */
  checkPermission(
    actor: Actor,
    resource: Resource,
    action: Action,
  ): Result.Result<AuthorizationDecision, AuthorizationError>;

  /**
   * Enforce authorization - returns success or error
   * Use this in commands to fail fast if not authorized
   *
   * @param actor - The actor attempting the action
   * @param resource - The resource being accessed
   * @param action - The action being performed
   * @returns Result with true if allowed, error if denied
   */
  enforce(
    actor: Actor,
    resource: Resource,
    action: Action,
  ): Result.Result<true, AuthorizationError>;
}
