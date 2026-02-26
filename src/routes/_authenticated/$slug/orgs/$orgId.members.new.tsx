import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AddMemberDialog } from "@/features/organization/components/add-member-dialog";
import { generateLoadOrganizationDetailQueryOptions } from "@/features/organization/actions";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions";
import { cast } from "@/domain/shared/ids";
import type { OrgId } from "@/domain/shared/ids";

export const Route = createFileRoute("/_authenticated/$slug/orgs/$orgId/members/new")({
  loader: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    return context.queryClient.ensureQueryData(
      generateLoadOrganizationDetailQueryOptions(event.id, params.orgId),
    );
  },
  component: AddMemberPage,
});

function AddMemberPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const { slug, orgId } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));
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
      orgId={cast<OrgId>(organization.id)}
      eventId={event.id}
      defaultOpen={true}
      onClose={handleClose}
    />
  );
}
