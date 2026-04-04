import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AddMemberDialog } from "@/features/organization/components/add-member-dialog";
import { EmailInput } from "@/features/organization/components/email-input";
import { generateLoadOrganizationDetailQueryOptions } from "@/features/organization/actions/queries";
import { cast } from "@akabase/domain/shared/ids";
import type { OrgId } from "@akabase/domain/organization/schema";

export const Route = createFileRoute("/_authenticated/$slug/orgs/$orgId/members/new")({
  loader: async ({ params, context }) => {
    const event = context.activeEvent;
    return context.queryClient.ensureQueryData(
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

  const handleClose = async () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      await navigate({ to: "..", replace: true });
    }
  };

  return (
    <AddMemberDialog
      orgId={cast<OrgId>(organization.id)}
      eventId={event.id}
      defaultOpen={true}
      onClose={handleClose}
      renderEmailField={(props) => <EmailInput {...props} />}
    />
  );
}
