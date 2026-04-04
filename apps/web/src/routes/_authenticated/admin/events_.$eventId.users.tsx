import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { generateLoadUsersForEventQueryOptions } from "@/features/user/actions/queries";
import { EventUsersTable } from "@/features/user/components/event-users-table";
import type { EventId } from "@akabase/domain/event/schema";
import { cast } from "@akabase/domain/shared/ids";

export const Route = createFileRoute("/_authenticated/admin/events_/$eventId/users")({
  loader: async ({ params, context }) => {
    const { eventId } = params;
    await context.queryClient.ensureQueryData(generateLoadUsersForEventQueryOptions(eventId));
  },
  component: EventUserListPage,
});

function EventUserListPage() {
  const { eventId } = Route.useParams();
  const { data: users } = useSuspenseQuery(generateLoadUsersForEventQueryOptions(eventId));

  return <EventUsersTable users={users} eventId={cast<EventId>(eventId)} />;
}
