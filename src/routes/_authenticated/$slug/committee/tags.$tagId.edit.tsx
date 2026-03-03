import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { generateLoadTagsQueryOptions } from "@/features/event/actions/queries";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions";
import { EditTagDialog } from "@/features/event/components";

export const Route = createFileRoute("/_authenticated/$slug/committee/tags/$tagId/edit")({
  beforeLoad: async ({ params, context }) => {
    const event = context.activeEvent;
    const permissions = await context.queryClient.ensureQueryData(
      generateCheckCommitteePermissionsQueryOptions(event.id),
    );
    if (!permissions.canManageTags) {
      throw redirect({ to: "/$slug/committee/tags", params });
    }
  },
  loader: async ({ context }) => {
    const event = context.activeEvent;
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadTagsQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateCheckCommitteePermissionsQueryOptions(event.id)),
    ]);
  },
  component: EditTagPage,
});

function EditTagPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const { tagId } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();
  const { data: tags } = useSuspenseQuery(generateLoadTagsQueryOptions(event.id));

  const tag = tags.find((t) => t.id === tagId);

  const handleClose = () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      navigate({ to: "/$slug/committee/tags", params: { slug: event.slug }, replace: true });
    }
  };

  if (!tag) {
    handleClose();
    return null;
  }

  return <EditTagDialog eventId={event.id} tag={tag} defaultOpen={true} onClose={handleClose} />;
}
