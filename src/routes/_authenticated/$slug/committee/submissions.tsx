import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Container, Flex, Stack } from "styled-system/jsx";
import { Heading } from "@/components/ui";
import { generateLoadEventSubmissionsQueryOptions } from "@/features/project/actions/queries";
import { EventSubmissionsTable } from "@/features/project/components";
import { submissionStatusSchema } from "@/domain/project/schema";

const searchSchema = z.object({
  status: z.array(submissionStatusSchema).optional(),
  page: z.number().int().positive().optional(),
});

export const Route = createFileRoute("/_authenticated/$slug/committee/submissions")({
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    const event = context.activeEvent;
    await context.queryClient.ensureQueryData(generateLoadEventSubmissionsQueryOptions(event.id));
  },
  component: SubmissionsPage,
});

function SubmissionsPage() {
  const { slug } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();

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
