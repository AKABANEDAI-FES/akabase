import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Heading } from "@akabase/ui/components/heading";
import { Container, Stack } from "@akabase/styled-system/jsx";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions/queries";
import { generateLoadUsersForEventQueryOptions } from "@/features/user/actions/queries";
import { EventUsersTable } from "@/features/user/components/event-users-table";

export const Route = createFileRoute("/_authenticated/$slug/committee/members")({
  loader: async ({ context }) => {
    const event = context.activeEvent;
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadUsersForEventQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateCheckCommitteePermissionsQueryOptions(event.id)),
    ]);
  },
  component: MembersManagementPage,
});

function MembersManagementPage() {
  const { activeEvent: event } = Route.useRouteContext();
  const { data: users } = useSuspenseQuery(generateLoadUsersForEventQueryOptions(event.id));
  const { data: permissions } = useSuspenseQuery(
    generateCheckCommitteePermissionsQueryOptions(event.id),
  );

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <Heading as="h1" textStyle="2xl" fontWeight="bold">
          メンバー管理
        </Heading>

        <EventUsersTable users={users} eventId={event.id} disabled={!permissions.canUpdateEvent} />
      </Stack>
    </Container>
  );
}
