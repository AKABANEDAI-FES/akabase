/**
 * Base error utilities for domain layer
 */

export type BaseError<TCode extends string = string> = {
  code: TCode;
  message: string;
};

export function createError<TCode extends string>(code: TCode, message: string): BaseError<TCode> {
  return { code, message };
}
