import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Container, Flex, Stack } from "styled-system/jsx";
import { Heading } from "@/components/ui";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions/queries";
import { generateLoadEventSubmissionsQueryOptions } from "@/features/project/actions/queries";
import { EventSubmissionsTable } from "@/features/project/components";

export const Route = createFileRoute("/_authenticated/$slug/committee/submissions")({
  loader: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    await context.queryClient.ensureQueryData(generateLoadEventSubmissionsQueryOptions(event.id));
  },
  component: SubmissionsPage,
});

function SubmissionsPage() {
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <Flex justify="space-between" align="center">
          <Heading as="h1" textStyle="2xl" fontWeight="bold">
            提出一覧
          </Heading>
        </Flex>

        <EventSubmissionsTable eventId={event.id} slug={slug} />
      </Stack>
    </Container>
  );
}
