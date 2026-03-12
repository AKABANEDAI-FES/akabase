import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const getTimezone = createIsomorphicFn()
  .server(() => {
    const req = getRequest();
    if (typeof req.cf?.timezone !== "string") {
      return "UTC";
    }
    return req.cf.timezone;
  })
  .client(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  });

/**
 * Format a Date to a string compatible with `<input type="datetime-local">`.
 * Uses local time (not UTC) so the displayed value matches the user's timezone.
 */
export function toDatetimeLocalValue(date: Date): string {
  const timezone = getTimezone();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const y = getPart("year");
  const m = getPart("month");
  const d = getPart("day");
  const h = getPart("hour");
  const min = getPart("minute");
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function FormatDate({
  value,
  option,
  locale = "ja-JP",
}: {
  value: Date;
  option?: Intl.DateTimeFormatOptions;
  locale?: string;
}) {
  const timezone = getTimezone();
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    ...option,
  }).format(value);
}
