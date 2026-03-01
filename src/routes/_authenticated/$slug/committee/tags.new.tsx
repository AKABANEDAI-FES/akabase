import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CreateTagDialog } from "@/features/event/components";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions";
import { generateLoadTagsQueryOptions } from "@/features/event/actions/queries";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions";

export const Route = createFileRoute("/_authenticated/$slug/committee/tags/new")({
  beforeLoad: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    const permissions = await context.queryClient.ensureQueryData(
      generateCheckCommitteePermissionsQueryOptions(event.id),
    );
    if (!permissions.canManageTags) {
      throw redirect({ to: "/$slug/committee/tags", params });
    }
  },
  loader: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
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
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));

  const handleClose = () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      navigate({ to: "..", replace: true });
    }
  };

  return <CreateTagDialog eventId={event.id} defaultOpen={true} onClose={handleClose} />;
}
