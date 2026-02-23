import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { generateLoadUsersForEventQueryOptions } from "@/features/user/actions";
import { generateLoadEventDetailQueryOptions } from "@/features/event/actions";
import { EventUsersTable } from "@/features/user/components";
import { Container, Stack } from "styled-system/jsx";
import { Button, Heading, Text } from "@/components/ui";
import { ArrowLeftIcon } from "lucide-react";

export const Route = createFileRoute("/admin/events_/$eventId_/users")({
  loader: async ({ params, context }) => {
    const eventId = params.eventId;
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadUsersForEventQueryOptions(eventId)),
      context.queryClient.ensureQueryData(generateLoadEventDetailQueryOptions(eventId)),
    ]);
  },
  component: EventUserListPage,
});

function EventUserListPage() {
  const { eventId } = Route.useParams();
  const { data: users } = useSuspenseQuery(generateLoadUsersForEventQueryOptions(eventId));
  const { data: event } = useSuspenseQuery(generateLoadEventDetailQueryOptions(eventId));

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
