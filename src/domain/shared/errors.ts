/**
 * Base error utilities for domain layer
 */

export const DOMAIN_ERROR_CODE = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODE)[keyof typeof DOMAIN_ERROR_CODE];

/** Context-specific error code union with shared domain error codes */
export type DomainErrorCodeOf<T> = T[keyof T] | DomainErrorCode;

export type BaseError<TCode extends string = string> = {
  code: TCode;
  message: string;
};

export function createError<TCode extends string>(code: TCode, message: string): BaseError<TCode> {
  return { code, message };
}
