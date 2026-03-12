import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { CreateTagDialog } from "@/features/event/components/create-tag-dialog";
import { generateLoadTagsQueryOptions } from "@/features/event/actions/queries/tag";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions/queries";

export const Route = createFileRoute("/_authenticated/$slug/committee/tags/new")({
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
  component: CreateTagPage,
});

function CreateTagPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const { activeEvent: event } = Route.useRouteContext();

  const handleClose = async () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      await navigate({ to: "..", replace: true });
    }
  };

  return <CreateTagDialog eventId={event.id} defaultOpen={true} onClose={handleClose} />;
}
