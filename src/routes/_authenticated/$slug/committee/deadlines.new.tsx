import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CreateDeadlineDialog } from "@/features/event/components";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions";
import { generateLoadDeadlinesQueryOptions } from "@/features/event/actions/queries";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions";
import { cast } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";

export const Route = createFileRoute("/_authenticated/$slug/committee/deadlines/new")({
  beforeLoad: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    const permissions = await context.queryClient.ensureQueryData(
      generateCheckCommitteePermissionsQueryOptions(event.id),
    );
    if (!permissions.canCreateDeadline) {
      throw redirect({ to: "/$slug/committee/deadlines", params });
    }
  },
  loader: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    await context.queryClient.ensureQueryData(generateLoadDeadlinesQueryOptions(event.id));
  },
  component: CreateDeadlinePage,
});

function CreateDeadlinePage() {
  const router = useRouter();
  const navigate = useNavigate();
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));

  const handleClose = () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      navigate({ to: "..", replace: true });
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
