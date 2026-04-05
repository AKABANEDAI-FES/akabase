import { createFileRoute } from "@tanstack/react-router";
import { Stack } from "@akabase/styled-system/jsx";
import { generateLoadOrganizationDetailQueryOptions } from "@/features/organization/actions/queries";
import { generateLoadProjectsQueryOptions } from "@/features/project/actions/queries";
import { OrgProjectsList } from "@/features/organization/components/org-projects-list";
import { cast } from "@akabase/domain/shared/ids";
import type { OrgId } from "@akabase/domain/organization/schema";

export const Route = createFileRoute("/_authenticated/$slug/orgs/$orgId/")({
  loader: async ({ context, params }) => {
    const event = context.activeEvent;
    await Promise.all([
      context.queryClient.ensureQueryData(
        generateLoadOrganizationDetailQueryOptions(event.id, params.orgId),
      ),
      context.queryClient.ensureQueryData(generateLoadProjectsQueryOptions(event.id, params.orgId)),
    ]);
  },
  component: OrganizationDashboard,
});

function OrganizationDashboard() {
  const { slug, orgId } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();

  return (
    <Stack gap="4">
      <OrgProjectsList eventId={event.id} orgId={cast<OrgId>(orgId)} slug={slug} />
    </Stack>
  );
}
