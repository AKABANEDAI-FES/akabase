/**
 * Base error utilities for domain layer
 */

export const DOMAIN_ERROR_CODE = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODE)[keyof typeof DOMAIN_ERROR_CODE];

export type BaseError<TCode extends string = string> = {
  code: TCode | DomainErrorCode;
  message: string;
};

export function createError<TCode extends string>(code: TCode, message: string): BaseError<TCode> {
  return { code, message };
}
