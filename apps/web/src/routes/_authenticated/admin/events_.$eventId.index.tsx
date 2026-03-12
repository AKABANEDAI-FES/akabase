import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { cast } from "@archive/domain/shared/ids";
import type { EventId } from "@archive/domain/event/schema";
import { EventStatusAlert } from "@/features/event/components/event-status-alert";
import { EventStatusControls } from "@/features/event/components/event-status-controls";
import { generateLoadEventDetailQueryOptions } from "@/features/event/actions/queries";
import { Stack } from "@archive/styled-system/jsx";
import { UpdateEventForm } from "@/features/event/components/update-event-form";

export const Route = createFileRoute("/_authenticated/admin/events_/$eventId/")({
  component: EditEventPage,
});

function EditEventPage() {
  const { eventId } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventDetailQueryOptions(eventId));

  return (
    <Stack gap="8">
      <EventStatusAlert status={event.status} />

      <UpdateEventForm event={event} />

      <EventStatusControls
        eventId={cast<EventId>(event.id)}
        eventName={event.name}
        status={event.status}
      />
    </Stack>
  );
}
