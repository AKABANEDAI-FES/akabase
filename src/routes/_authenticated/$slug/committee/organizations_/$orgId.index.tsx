import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Stack } from "styled-system/jsx";
import { Trash2Icon } from "lucide-react";
import { generateLoadOrganizationDetailQueryOptions } from "@/features/organization/actions";
import { generateCheckIsCommitteeAdminQueryOptions } from "@/features/authorization/actions";
import { UpdateOrganizationForm } from "@/features/organization/components/update-organization-form";
import { DeleteOrganizationDialog } from "@/features/organization/components/delete-organization-dialog";
import { Button, Fieldset } from "@/components/ui";
import type { OrgId } from "@/domain/shared/ids";

export const Route = createFileRoute("/_authenticated/$slug/committee/organizations_/$orgId/")({
  loader: async ({ params, context }) => {
    const organization = await context.queryClient.ensureQueryData(
      generateLoadOrganizationDetailQueryOptions(params.orgId),
    );
    await context.queryClient.ensureQueryData(
      generateCheckIsCommitteeAdminQueryOptions(organization.eventId),
    );
  },
  component: EditOrganizationPage,
});

function EditOrganizationPage() {
  const { slug, orgId } = Route.useParams();
  const { data: organization } = useSuspenseQuery(
    generateLoadOrganizationDetailQueryOptions(orgId),
  );

  return (
    <Stack gap="8">
      <UpdateOrganizationForm organization={organization} />
      <DeleteOrganizationSection
        orgId={organization.id as OrgId}
        orgName={organization.name}
        eventId={organization.eventId}
        slug={slug}
      />
    </Stack>
  );
}

function DeleteOrganizationSection({
  orgId,
  orgName,
  eventId,
  slug,
}: {
  orgId: OrgId;
  orgName: string;
  eventId: string;
  slug: string;
}) {
  const { data: authCheck } = useSuspenseQuery(generateCheckIsCommitteeAdminQueryOptions(eventId));

  if (!authCheck.isCommitteeAdmin) {
    return null;
  }

  return (
    <Fieldset.Root>
      <Fieldset.Control>
        <Fieldset.Legend>団体の削除</Fieldset.Legend>
        <Fieldset.HelperText>
          この団体を削除すると、所属するすべての企画・メンバーも削除されます。この操作は取り消せません。
        </Fieldset.HelperText>
      </Fieldset.Control>
      <Fieldset.Content>
        <DeleteOrganizationDialog orgId={orgId} orgName={orgName} slug={slug}>
          <Button variant="outline" colorPalette="red" w="fit" ml="auto">
            <Trash2Icon />
            団体を削除
          </Button>
        </DeleteOrganizationDialog>
      </Fieldset.Content>
    </Fieldset.Root>
  );
}
