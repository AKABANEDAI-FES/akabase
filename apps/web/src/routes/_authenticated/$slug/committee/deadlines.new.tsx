import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { CreateDeadlineDialog } from "@/features/event/components/create-deadline-dialog";
import { generateLoadDeadlinesQueryOptions } from "@/features/event/actions/queries/deadline";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions/queries";
import { cast } from "@akabase/domain/shared/ids";
import type { EventId } from "@akabase/domain/event/schema";

export const Route = createFileRoute("/_authenticated/$slug/committee/deadlines/new")({
  beforeLoad: async ({ params, context }) => {
    const event = context.activeEvent;
    const permissions = await context.queryClient.ensureQueryData(
      generateCheckCommitteePermissionsQueryOptions(event.id),
    );
    if (!permissions.canManageDeadlines) {
      throw redirect({ to: "/$slug/committee/deadlines", params });
    }
  },
  loader: async ({ context }) => {
    const event = context.activeEvent;
    await context.queryClient.ensureQueryData(generateLoadDeadlinesQueryOptions(event.id));
  },
  component: CreateDeadlinePage,
});

function CreateDeadlinePage() {
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

  return (
    <CreateDeadlineDialog
      eventId={cast<EventId>(event.id)}
      defaultOpen={true}
      onClose={handleClose}
    />
  );
}
