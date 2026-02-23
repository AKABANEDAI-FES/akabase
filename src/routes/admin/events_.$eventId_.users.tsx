import { createFileRoute } from "@tanstack/react-router";
import { loadUsersForEventFn } from "@/features/user/actions";
import { loadEventDetailFn } from "@/features/event/actions";
import { EventUsersTable } from "@/features/user/components";
import { css } from "styled-system/css";
import { Stack } from "styled-system/jsx";

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
    <div className={css({ padding: "8", maxWidth: "1400px", margin: "0 auto" })}>
      <Stack gap="6">
        <Stack gap="2">
          <h1 className={css({ fontSize: "2xl", fontWeight: "bold" })}>委員会メンバー管理</h1>
          <p className={css({ color: "gray.600" })}>{event.name}</p>
        </Stack>

        <EventUsersTable users={users} eventId={event.id} />
      </Stack>
    </div>
  );
}
