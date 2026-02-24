import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Stack } from "styled-system/jsx";
import { generateLoadOrganizationDetailQueryOptions } from "@/features/organization/actions";
import { UpdateOrganizationForm } from "@/features/organization/components/update-organization-form";

export const Route = createFileRoute("/_authenticated/$slug/committee/organizations_/$orgId/")({
  component: EditOrganizationPage,
});

function EditOrganizationPage() {
  const { orgId } = Route.useParams();
  const { data: organization } = useSuspenseQuery(
    generateLoadOrganizationDetailQueryOptions(orgId),
  );

  return (
    <Stack gap="8">
      <UpdateOrganizationForm organization={organization} />
    </Stack>
  );
}
