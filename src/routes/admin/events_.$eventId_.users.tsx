import { Link, createFileRoute } from "@tanstack/react-router";
import { loadUsersForEventFn } from "@/features/user/actions";
import { loadEventDetailFn } from "@/features/event/actions";
import { EventUsersTable } from "@/features/user/components";
import { Container, Stack } from "styled-system/jsx";
import { Button, Heading, Text } from "@/components/ui";
import { ArrowLeftIcon } from "lucide-react";

export const Route = createFileRoute("/admin/events_/$eventId_/users")({
  loader: async ({ params }) => {
    const eventId = params.eventId;
    const [users, event] = await Promise.all([
      loadUsersForEventFn({ data: { eventId } }),
      loadEventDetailFn({ data: { eventId } }),
    ]);

    return {
      users,
      event,
    };
  },
  component: EventUserListPage,
});

function EventUserListPage() {
  const { users, event } = Route.useLoaderData();

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <div>
          <Button variant="plain" size="sm" mb="4" asChild>
            <Link to="/admin/events/$eventId" params={{ eventId: event.id }}>
              <ArrowLeftIcon />
              イベント編集に戻る
            </Link>
          </Button>
          <Stack gap="2">
            <Heading as="h1" textStyle="2xl" fontWeight="bold">
              委員会メンバー管理
            </Heading>
            <Text color="fg.muted">{event.name}</Text>
          </Stack>
        </div>

        <EventUsersTable users={users} eventId={event.id} />
      </Stack>
    </Container>
  );
}
