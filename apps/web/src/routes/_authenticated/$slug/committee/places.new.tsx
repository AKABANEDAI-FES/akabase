import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { generateLoadPlacesQueryOptions } from "@/features/event/actions/queries/place";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions/queries";
import { CreatePlaceDialog } from "@/features/event/components/create-place-dialog";

export const Route = createFileRoute("/_authenticated/$slug/committee/places/new")({
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
  component: CreatePlacePage,
});

function CreatePlacePage() {
  const router = useRouter();
  const navigate = useNavigate();
  const { activeEvent: event } = Route.useRouteContext();
  const { data: places } = useSuspenseQuery(generateLoadPlacesQueryOptions(event.id));

  const handleClose = async () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      await navigate({ to: "..", replace: true });
    }
  };

  return (
    <CreatePlaceDialog
      eventId={event.id}
      places={places}
      defaultOpen={true}
      onClose={handleClose}
    />
  );
}
