import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { CreateProjectDialog } from "@/features/project/components/create-project-dialog";
import { generateLoadPlacesQueryOptions } from "@/features/event/actions/queries/place";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions/queries";
import { cast } from "@archive/domain/shared/ids";
import type { OrgId } from "@archive/domain/organization/schema";

export const Route = createFileRoute(
  "/_authenticated/$slug/committee/organizations_/$orgId/projects/new",
)({
  beforeLoad: async ({ params, context }) => {
    const event = context.activeEvent;
    const permissions = await context.queryClient.ensureQueryData(
      generateCheckCommitteePermissionsQueryOptions(event.id),
    );
    if (!permissions.canCreateProject) {
      throw redirect({
        to: "/$slug/committee/organizations/$orgId/projects",
        params,
      });
    }
  },
  loader: async ({ context }) => {
    const event = context.activeEvent;
    await context.queryClient.ensureQueryData(generateLoadPlacesQueryOptions(event.id));
  },
  component: CreateProjectPage,
});

function CreateProjectPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const { orgId } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();

  const handleClose = async () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      await navigate({ to: "..", replace: true });
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
