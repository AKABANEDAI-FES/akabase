import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Stack } from "@archive/styled-system/jsx";
import { Trash2Icon } from "lucide-react";
import { generateLoadOrganizationDetailQueryOptions } from "@/features/organization/actions";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions";
import { UpdateOrganizationForm } from "@/features/organization/components/update-organization-form";
import { DeleteOrganizationDialog } from "@/features/organization/components/delete-organization-dialog";
import { Button, Fieldset } from "@/components/ui";
import type { EventId, OrgId } from "@/domain/shared/ids";

export const Route = createFileRoute("/_authenticated/$slug/committee/organizations_/$orgId/")({
  loader: async ({ params, context }) => {
    const event = context.activeEvent;
    await Promise.all([
      context.queryClient.ensureQueryData(
        generateLoadOrganizationDetailQueryOptions(event.id, params.orgId),
      ),
      context.queryClient.ensureQueryData(generateCheckCommitteePermissionsQueryOptions(event.id)),
    ]);
  },
  component: EditOrganizationPage,
});

function EditOrganizationPage() {
  const { slug, orgId } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();
  const { data: organization } = useSuspenseQuery(
    generateLoadOrganizationDetailQueryOptions(event.id, orgId),
  );

  const { data: permissions } = useSuspenseQuery(
    generateCheckCommitteePermissionsQueryOptions(organization.eventId),
  );

  return (
    <Stack gap="8">
      <UpdateOrganizationForm
        organization={organization}
        disabled={!permissions.canUpdateOrganization}
      />
      {permissions.canDeleteOrganization && (
        <DeleteOrganizationSection
          eventId={organization.eventId}
          orgId={organization.id as OrgId}
          orgName={organization.name}
          slug={slug}
        />
      )}
    </Stack>
  );
}

function DeleteOrganizationSection({
  eventId,
  orgId,
  orgName,
  slug,
}: {
  eventId: EventId;
  orgId: OrgId;
  orgName: string;
  slug: string;
}) {
  return (
    <Fieldset.Root>
      <Fieldset.Control>
        <Fieldset.Legend>出展団体の削除</Fieldset.Legend>
        <Fieldset.HelperText>
          この出展団体を削除すると、所属するすべての企画・メンバーも削除されます。この操作は取り消せません。
        </Fieldset.HelperText>
      </Fieldset.Control>
      <Fieldset.Content>
        <DeleteOrganizationDialog eventId={eventId} orgId={orgId} orgName={orgName} slug={slug}>
          <Button variant="outline" colorPalette="red" w="fit" ml="auto">
            <Trash2Icon />
            出展団体を削除
          </Button>
        </DeleteOrganizationDialog>
      </Fieldset.Content>
    </Fieldset.Root>
  );
}
