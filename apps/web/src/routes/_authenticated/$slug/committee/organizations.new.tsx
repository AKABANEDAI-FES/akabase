import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { CreateOrganizationDialog } from "@/features/organization/components/create-organization-dialog";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions/queries";
import { cast } from "@archive/domain/shared/ids";
import type { EventId } from "@archive/domain/event/schema";

export const Route = createFileRoute("/_authenticated/$slug/committee/organizations/new")({
  beforeLoad: async ({ params, context }) => {
    const event = context.activeEvent;
    const permissions = await context.queryClient.ensureQueryData(
      generateCheckCommitteePermissionsQueryOptions(event.id),
    );
    if (!permissions.canCreateOrganization) {
      throw redirect({ to: "/$slug/committee/organizations", params });
    }
  },
  component: CreateOrganizationPage,
});

function CreateOrganizationPage() {
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
    <CreateOrganizationDialog
      eventId={cast<EventId>(event.id)}
      defaultOpen={true}
      onClose={handleClose}
    />
  );
}
