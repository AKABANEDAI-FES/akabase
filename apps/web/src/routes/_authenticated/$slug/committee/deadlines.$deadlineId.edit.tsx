import {
  createFileRoute,
  notFound,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { generateLoadDeadlinesQueryOptions } from "@/features/event/actions/queries/deadline";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions/queries";
import { EditDeadlineDialog } from "@/features/event/components/edit-deadline-dialog";

export const Route = createFileRoute("/_authenticated/$slug/committee/deadlines/$deadlineId/edit")({
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
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadDeadlinesQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateCheckCommitteePermissionsQueryOptions(event.id)),
    ]);
  },
  component: EditDeadlinePage,
});

function EditDeadlinePage() {
  const router = useRouter();
  const navigate = useNavigate();
  const { deadlineId } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();
  const { data: deadlines } = useSuspenseQuery(generateLoadDeadlinesQueryOptions(event.id));

  const deadline = deadlines.find((d) => d.id === deadlineId);

  const handleClose = async () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      await navigate({
        to: "/$slug/committee/deadlines",
        params: { slug: event.slug },
        replace: true,
      });
    }
  };

  if (!deadline) {
    throw notFound();
  }

  return (
    <EditDeadlineDialog
      eventId={event.id}
      deadline={deadline}
      defaultOpen={true}
      onClose={handleClose}
    />
  );
}
