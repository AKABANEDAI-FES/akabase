import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CreateProjectDialog } from "@/features/project/components";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions";
import { generateLoadPlacesQueryOptions } from "@/features/project/actions";
import { cast } from "@/domain/shared/ids";
import type { OrgId } from "@/domain/shared/ids";

export const Route = createFileRoute(
  "/_authenticated/$slug/committee/organizations_/$orgId_/projects/new",
)({
  loader: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    await context.queryClient.ensureQueryData(generateLoadPlacesQueryOptions(event.id));
  },
  component: CreateProjectPage,
});

function CreateProjectPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const { slug, orgId } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));

  const handleClose = () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      navigate({ to: "..", replace: true });
    }
  };

  return (
    <CreateProjectDialog
      eventId={event.id}
      orgId={cast<OrgId>(orgId)}
      defaultOpen={true}
      onClose={handleClose}
    />
  );
}
