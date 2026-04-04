import type { Deadline, DeadlineFieldKey } from "@akabase/domain/event/schema";
import { DEADLINE_FIELD_LABELS } from "@akabase/domain/event/schema";
import { FormatDate } from "@/libs/date";

/**
 * Get deadline status for a specific field
 */
export function getFieldDeadlineStatus(
  fieldKey: DeadlineFieldKey,
  deadlines: Deadline[],
  now: Date,
): "before_start" | "active" | "expired" | "no_deadline" {
  const deadline = deadlines.find((d) => d.fieldKey === fieldKey);

  if (!deadline) {
    return "no_deadline";
  }

  if (deadline.startAt && now < deadline.startAt) {
    return "before_start";
  }

  if (deadline.deadlineAt <= now) {
    return "expired";
  }

  return "active";
}

/**
 * Generate user-friendly message for deadline status
 */
export function getDeadlineMessage(
  fieldKey: DeadlineFieldKey,
  deadlines: Deadline[],
  now: Date,
): React.ReactNode {
  const deadline = deadlines.find((d) => d.fieldKey === fieldKey);
  const fieldLabel = DEADLINE_FIELD_LABELS[fieldKey];

  if (!deadline) {
    return null;
  }

  if (deadline.startAt && now < deadline.startAt) {
    return (
      <>
        {fieldLabel}の編集期間は
        <FormatDate
          value={deadline.startAt}
          option={{
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }}
        />
        から開始されます
      </>
    );
  }

  if (deadline.deadlineAt <= now) {
    return (
      <>
        {fieldLabel}の締切（
        <FormatDate
          value={deadline.deadlineAt}
          option={{
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }}
        />
        ）を過ぎているため、編集できません
      </>
    );
  }

  return null;
}
