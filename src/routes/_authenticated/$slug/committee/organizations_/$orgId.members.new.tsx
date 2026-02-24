import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AddMemberDialog } from "@/features/organization/components/add-member-dialog";
import { generateLoadOrganizationDetailQueryOptions } from "@/features/organization/actions";
import type { OrgId } from "@/domain/shared/ids";

export const Route = createFileRoute(
  "/_authenticated/$slug/committee/organizations_/$orgId/members/new",
)({
  loader: async ({ params, context }) =>
    context.queryClient.ensureQueryData(generateLoadOrganizationDetailQueryOptions(params.orgId)),
  component: AddMemberPage,
});

function AddMemberPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const { orgId } = Route.useParams();
  const { data: organization } = useSuspenseQuery(
    generateLoadOrganizationDetailQueryOptions(orgId),
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
