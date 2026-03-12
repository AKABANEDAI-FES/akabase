import { createFileRoute } from "@tanstack/react-router";
import { Container, Flex, Stack } from "@archive/styled-system/jsx";
import { Heading } from "@archive/ui/components/heading";
import { generateLoadEventPublishedDataQueryOptions } from "@/features/project/actions/queries";
import { generateLoadPlacesQueryOptions } from "@/features/event/actions/queries/place";
import { ExportDataTable } from "@/features/project/components/export-data-table";

export const Route = createFileRoute("/_authenticated/$slug/committee/export")({
  loader: async ({ context }) => {
    const event = context.activeEvent;
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadEventPublishedDataQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateLoadPlacesQueryOptions(event.id)),
    ]);
  },
  component: ExportPage,
});

function ExportPage() {
  const { slug } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <Flex justify="space-between" align="center">
          <Heading as="h1" textStyle="2xl" fontWeight="bold">
            データエクスポート
          </Heading>
        </Flex>

        <ExportDataTable eventId={event.id} slug={slug} />
      </Stack>
    </Container>
  );
}
