import type { BaseError } from "../shared/errors";
import { createError } from "../shared/errors";

export const EVENT_ERROR_CODE = {
  EVENT_ARCHIVED: "EVENT_ARCHIVED",
  EVENT_ALREADY_ACTIVE: "EVENT_ALREADY_ACTIVE",
  TAG_SLUG_NOT_UNIQUE: "TAG_SLUG_NOT_UNIQUE",
  PLACE_NOT_UNIQUE: "PLACE_NOT_UNIQUE",
  TAG_NOT_FOUND: "TAG_NOT_FOUND",
  PLACE_NOT_FOUND: "PLACE_NOT_FOUND",
  DEADLINE_NOT_FOUND: "DEADLINE_NOT_FOUND",
  FIELD_PAST_DEADLINE: "FIELD_PAST_DEADLINE",
  EVENT_NOT_FOUND: "EVENT_NOT_FOUND",
  SLUG_NOT_UNIQUE: "SLUG_NOT_UNIQUE",
} as const;

export type EventErrorCode = (typeof EVENT_ERROR_CODE)[keyof typeof EVENT_ERROR_CODE];

export type EventError = BaseError<EventErrorCode>;

export function eventError(code: EventErrorCode, message: string): EventError {
  return createError(code, message);
}
