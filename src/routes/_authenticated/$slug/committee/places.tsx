import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button, Heading } from "@/components/ui";
import { Container, Flex, Stack } from "styled-system/jsx";
import { PlusIcon } from "lucide-react";
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
    <>
      <Container maxW="6xl" py="8">
        <Stack gap="6">
          <Flex justify="space-between" align="center">
            <Heading as="h1" textStyle="2xl" fontWeight="bold">
              場所管理
            </Heading>
            <Button asChild>
              <Link to="/$slug/committee/places/new" params={{ slug }}>
                <PlusIcon />
                場所を追加
              </Link>
            </Button>
          </Flex>

          <PlaceManagementTable places={places} eventId={event.id} />
        </Stack>
      </Container>
      <Outlet />
    </>
  );
}
