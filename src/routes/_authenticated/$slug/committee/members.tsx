import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Heading } from "@/components/ui";
import { Container, Stack } from "styled-system/jsx";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions/queries";
import { generateCheckIsCommitteeAdminQueryOptions } from "@/features/authorization/actions";
import { generateLoadUsersForEventQueryOptions } from "@/features/user/actions";
import { EventUsersTable } from "@/features/user/components";

export const Route = createFileRoute("/_authenticated/$slug/committee/members")({
  loader: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadUsersForEventQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateCheckIsCommitteeAdminQueryOptions(event.id)),
    ]);
  },
  component: MembersManagementPage,
});

function MembersManagementPage() {
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));
  const { data: users } = useSuspenseQuery(generateLoadUsersForEventQueryOptions(event.id));

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <Heading as="h1" textStyle="2xl" fontWeight="bold">
          メンバー管理
        </Heading>

        <EventUsersTable users={users} eventId={event.id} />
      </Stack>
    </Container>
  );
}
