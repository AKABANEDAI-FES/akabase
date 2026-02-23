import { Link, createFileRoute } from "@tanstack/react-router";
import { cast } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";
import { EventStatusAlert, EventStatusControls } from "@/features/event/components";
import { loadEventDetailFn } from "@/features/event/actions";
import { Container, Flex, Stack } from "styled-system/jsx";
import { Button, Heading } from "@/components/ui";
import { ArrowLeftIcon, UsersIcon } from "lucide-react";
import { UpdateEventForm } from "@/features/event/components/update-event-form";

export const Route = createFileRoute("/admin/events_/$eventId")({
  loader: async ({ params }) => {
    const event = await loadEventDetailFn({ data: { eventId: cast<EventId>(params.eventId) } });
    return { event };
  },
  component: EditEventPage,
});

function EditEventPage() {
  const { event } = Route.useLoaderData();

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="12">
        <div>
          <Button variant="plain" size="sm" mb="4" asChild>
            <Link to="/admin/events">
              <ArrowLeftIcon />
              イベント一覧に戻る
            </Link>
          </Button>
          <Flex justify="space-between" align="center">
            <Heading as="h1" textStyle="2xl" fontWeight="bold">
              イベントを編集
            </Heading>
            <Button variant="outline" asChild>
              <Link to="/admin/events/$eventId/users" params={{ eventId: event.id }}>
                <UsersIcon />
                委員会メンバー管理
              </Link>
            </Button>
          </Flex>
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
