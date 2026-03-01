import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { CreateOrganizationDialog } from "@/features/organization/components";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions";
import { cast } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";

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

  const handleClose = () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      navigate({ to: "..", replace: true });
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
