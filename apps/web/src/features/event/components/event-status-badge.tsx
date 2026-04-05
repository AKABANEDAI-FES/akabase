import { Badge } from "@akabase/ui/components/badge";
import type { EventListItem } from "@akabase/application/query/event/list-events";

type EventStatusBadgeProps = {
  status: EventListItem["status"];
};

/**
 * Event status badge component
 */
export function EventStatusBadge({ status }: EventStatusBadgeProps) {
  if (status === "active") {
    return <Badge variant="solid">Active</Badge>;
  }

  return <Badge variant="subtle">Archived</Badge>;
}
