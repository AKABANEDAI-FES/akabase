import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AddMemberDialog } from "@/features/organization/components/add-member-dialog";
import { generateLoadOrganizationDetailQueryOptions } from "@/features/organization/actions";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions";
import type { OrgId } from "@/domain/shared/ids";

export const Route = createFileRoute(
  "/_authenticated/$slug/committee/organizations_/$orgId/members/new",
)({
  beforeLoad: async ({ params, context }) => {
    const event = context.activeEvent;
    const permissions = await context.queryClient.ensureQueryData(
      generateCheckCommitteePermissionsQueryOptions(event.id),
    );
    if (!permissions.canManageOrgMembers) {
      throw redirect({
        to: "/$slug/committee/organizations/$orgId/members",
        params,
      });
    }
  },
  loader: async ({ params, context }) => {
    const event = context.activeEvent;
    await context.queryClient.ensureQueryData(
      generateLoadOrganizationDetailQueryOptions(event.id, params.orgId),
    );
  },
  component: AddMemberPage,
});

function AddMemberPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const { orgId } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();
  const { data: organization } = useSuspenseQuery(
    generateLoadOrganizationDetailQueryOptions(event.id, orgId),
  );

  const handleClose = () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      navigate({ to: "..", replace: true });
    }
  };

  return (
    <AddMemberDialog
      orgId={organization.id as OrgId}
      eventId={organization.eventId}
      defaultOpen={true}
      onClose={handleClose}
    />
  );
}
