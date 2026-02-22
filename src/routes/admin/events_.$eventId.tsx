import { Link, createFileRoute } from "@tanstack/react-router";
import { cast } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";
import { EventStatusAlert, EventStatusControls } from "@/features/event/components";
import { loadEventDetailFn } from "@/features/event/actions";
import { Container, Stack } from "styled-system/jsx";
import { Button, Heading } from "@/components/ui";
import { ArrowLeftIcon } from "lucide-react";
import { UpdateEventForm } from "@/features/event/components/update-event-form";

/**
 * Edit event route
 */
export const Route = createFileRoute("/admin/events_/$eventId")({
  loader: async ({ params }) => {
    const event = await loadEventDetailFn({ data: { eventId: cast<EventId>(params.eventId) } });
    return { event };
  },
  component: EditEventPage,
});

/**
 * Edit event page component
 */
function EditEventPage() {
  const { event } = Route.useLoaderData();

  return (
    <Container maxW="4xl" py="8">
      <Stack gap="12">
        {/* Header with back button */}
        <div>
          <Button variant="plain" size="sm" mb="4" asChild>
            <Link to="/admin/events">
              <ArrowLeftIcon />
              イベント一覧に戻る
            </Link>
          </Button>
          <Heading as="h1" textStyle="2xl" fontWeight="bold">
            イベントを編集
          </Heading>
        </div>

        <EventStatusAlert status={event.status} />

        <UpdateEventForm event={event} />

        <EventStatusControls
          eventId={cast<EventId>(event.id)}
          eventName={event.name}
          status={event.status}
        />
      </Stack>
    </Container>
  );
}
