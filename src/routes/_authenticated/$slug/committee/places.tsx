import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Heading } from "@/components/ui";
import { Container, Stack } from "styled-system/jsx";
import {
  generateLoadEventBySlugQueryOptions,
  generateLoadPlacesQueryOptions,
} from "@/features/event/actions/queries";
import { generateCheckIsCommitteeAdminQueryOptions } from "@/features/authorization/actions";
import { PlaceManagementTable } from "@/features/event/components/place-management-table";

export const Route = createFileRoute("/_authenticated/$slug/committee/places")({
  loader: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadPlacesQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateCheckIsCommitteeAdminQueryOptions(event.id)),
    ]);
  },
  component: PlacesManagementPage,
});

function PlacesManagementPage() {
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));
  const { data: places } = useSuspenseQuery(generateLoadPlacesQueryOptions(event.id));

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <Heading as="h1" textStyle="2xl" fontWeight="bold">
          場所管理 - {event.name}
        </Heading>

        <PlaceManagementTable places={places} eventId={event.id} />
      </Stack>
    </Container>
  );
}
