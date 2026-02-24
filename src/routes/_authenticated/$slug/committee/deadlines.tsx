import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Heading } from "@/components/ui";
import { Container, Stack } from "styled-system/jsx";
import {
  generateLoadDeadlinesQueryOptions,
  generateLoadEventBySlugQueryOptions,
} from "@/features/event/actions/queries";
import { generateCheckIsCommitteeAdminQueryOptions } from "@/features/authorization/actions";
import { DeadlineManagementTable } from "@/features/event/components/deadline-management-table";

export const Route = createFileRoute("/_authenticated/$slug/committee/deadlines")({
  loader: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadDeadlinesQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateCheckIsCommitteeAdminQueryOptions(event.id)),
    ]);
  },
  component: DeadlinesManagementPage,
});

function DeadlinesManagementPage() {
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));
  const { data: deadlines } = useSuspenseQuery(generateLoadDeadlinesQueryOptions(event.id));

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <Heading as="h1" textStyle="2xl" fontWeight="bold">
          締切管理 - {event.name}
        </Heading>

        <DeadlineManagementTable deadlines={deadlines} eventId={event.id} />
      </Stack>
    </Container>
  );
}
