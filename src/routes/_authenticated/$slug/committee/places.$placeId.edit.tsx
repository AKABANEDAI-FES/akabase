import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { generateLoadPlacesQueryOptions } from "@/features/event/actions/queries";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions";
import { EditPlaceDialog } from "@/features/event/components";

export const Route = createFileRoute("/_authenticated/$slug/committee/places/$placeId/edit")({
  beforeLoad: async ({ params, context }) => {
    const event = context.activeEvent;
    const permissions = await context.queryClient.ensureQueryData(
      generateCheckCommitteePermissionsQueryOptions(event.id),
    );
    if (!permissions.canManagePlaces) {
      throw redirect({ to: "/$slug/committee/places", params });
    }
  },
  loader: async ({ context }) => {
    const event = context.activeEvent;
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadPlacesQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateCheckCommitteePermissionsQueryOptions(event.id)),
    ]);
  },
  component: EditPlacePage,
});

function EditPlacePage() {
  const router = useRouter();
  const navigate = useNavigate();
  const { placeId } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();
  const { data: places } = useSuspenseQuery(generateLoadPlacesQueryOptions(event.id));

  const place = places.find((p) => p.id === placeId);

  const handleClose = () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      navigate({ to: "/$slug/committee/places", params: { slug: event.slug }, replace: true });
    }
  };

  if (!place) {
    handleClose();
    return null;
  }

  return (
    <EditPlaceDialog eventId={event.id} place={place} defaultOpen={true} onClose={handleClose} />
  );
}
