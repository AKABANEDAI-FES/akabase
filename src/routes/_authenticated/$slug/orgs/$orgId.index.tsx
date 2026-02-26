import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Stack } from "styled-system/jsx";
import { generateLoadOrganizationDetailQueryOptions } from "@/features/organization/actions/queries";
import { generateLoadProjectsQueryOptions } from "@/features/project/actions/queries";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions/queries";
import { OrgProjectsList } from "@/features/organization/components";
import { cast } from "@/domain/shared/ids";
import type { OrgId } from "@/domain/shared/ids";

export const Route = createFileRoute("/_authenticated/$slug/orgs/$orgId/")({
  loader: async ({ context, params }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
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
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));

  return (
    <Stack gap="4">
      <OrgProjectsList eventId={event.id} orgId={cast<OrgId>(orgId)} slug={slug} />
    </Stack>
  );
}
