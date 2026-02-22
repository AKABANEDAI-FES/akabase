import { Badge } from "@/components/ui";
import type { EventListItem } from "@/application/query/event/list-events";

interface EventStatusBadgeProps {
  status: EventListItem["status"];
}

/**
 * Event status badge component
 */
export function EventStatusBadge({ status }: EventStatusBadgeProps) {
  if (status === "active") {
    return <Badge variant="solid">Active</Badge>;
  }

  return <Badge variant="subtle">Archived</Badge>;
}
