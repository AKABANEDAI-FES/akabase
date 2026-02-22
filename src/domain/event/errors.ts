import type { BaseError } from "../shared/errors";
import { createError } from "../shared/errors";

export type EventErrorCode =
  | "EVENT_ARCHIVED"
  | "EVENT_ALREADY_ACTIVE"
  | "TAG_SLUG_NOT_UNIQUE"
  | "PLACE_NOT_UNIQUE"
  | "TAG_NOT_FOUND"
  | "PLACE_NOT_FOUND"
  | "DEADLINE_NOT_FOUND"
  | "FIELD_PAST_DEADLINE"
  | "EVENT_NOT_FOUND"
  | "SLUG_NOT_UNIQUE";

export type EventError = BaseError<EventErrorCode>;

export function eventError(code: EventErrorCode, message: string): EventError {
  return createError(code, message);
}
