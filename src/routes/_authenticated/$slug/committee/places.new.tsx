import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  generateLoadEventBySlugQueryOptions,
  generateLoadPlacesQueryOptions,
} from "@/features/event/actions/queries";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions";
import { CreatePlaceDialog } from "@/features/event/components";

export const Route = createFileRoute("/_authenticated/$slug/committee/places/new")({
  beforeLoad: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    const permissions = await context.queryClient.ensureQueryData(
      generateCheckCommitteePermissionsQueryOptions(event.id),
    );
    if (!permissions.canManagePlaces) {
      throw redirect({ to: "/$slug/committee/places", params });
    }
  },
  loader: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
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
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));
  const { data: places } = useSuspenseQuery(generateLoadPlacesQueryOptions(event.id));

  const handleClose = () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      navigate({ to: "..", replace: true });
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
