import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HStack, Stack } from "@archive/styled-system/jsx";
import { UserPlusIcon } from "lucide-react";
import { generateLoadOrganizationDetailQueryOptions } from "@/features/organization/actions/queries";
import { generateLoadOrganizationMembersQueryOptions } from "@/features/organization/actions/queries/member";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions/queries";
import { OrgMembersTable } from "@/features/organization/components/org-members-table";
import { Button } from "@archive/ui/components/button";
import { Text } from "@archive/ui/components/text";
import { cast } from "@archive/domain/shared/ids";
import type { EventId } from "@archive/domain/event/schema";
import type { OrgId } from "@archive/domain/organization/schema";

export const Route = createFileRoute(
  "/_authenticated/$slug/committee/organizations_/$orgId/members",
)({
  loader: async ({ params, context }) => {
    const event = context.activeEvent;
    await Promise.all([
      context.queryClient.ensureQueryData(
        generateLoadOrganizationDetailQueryOptions(event.id, params.orgId),
      ),
      context.queryClient.ensureQueryData(
        generateLoadOrganizationMembersQueryOptions(event.id, params.orgId),
      ),
      context.queryClient.ensureQueryData(generateCheckCommitteePermissionsQueryOptions(event.id)),
    ]);
  },
  component: OrganizationMembersPage,
});

function OrganizationMembersPage() {
  const { slug, orgId } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();
  const { data: organization } = useSuspenseQuery(
    generateLoadOrganizationDetailQueryOptions(event.id, orgId),
  );

  return (
    <MemberManagementSection
      slug={slug}
      orgId={cast<OrgId>(orgId)}
      eventId={organization.eventId}
    />
  );
}

function MemberManagementSection({
  slug,
  orgId,
  eventId,
}: {
  slug: string;
  orgId: OrgId;
  eventId: EventId;
}) {
  const { data: members } = useSuspenseQuery(
    generateLoadOrganizationMembersQueryOptions(eventId, orgId),
  );
  const { data: permissions } = useSuspenseQuery(
    generateCheckCommitteePermissionsQueryOptions(eventId),
  );

  return (
    <>
      <Stack gap="4">
        <HStack justify="space-between" alignItems="center">
          <Text color="fg.muted" textStyle="sm">
            マネージャーは企画の提出やメンバーの管理ができます。エディターは企画の編集のみ可能です。
          </Text>
          {permissions.canManageOrgMembers && (
            <Button variant="outline" flexShrink={0} asChild>
              <Link to="/$slug/committee/organizations/$orgId/members/new" params={{ slug, orgId }}>
                <UserPlusIcon />
                メンバーを追加
              </Link>
            </Button>
          )}
        </HStack>
        <OrgMembersTable
          members={members}
          eventId={eventId}
          orgId={orgId}
          canManageMembers={permissions.canManageOrgMembers}
        />
      </Stack>
      <Outlet />
    </>
  );
}
