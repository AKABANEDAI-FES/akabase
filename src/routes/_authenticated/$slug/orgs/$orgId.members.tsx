import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Flex, Stack } from "@archive/styled-system/jsx";
import { Button, Heading } from "@/components/ui";
import { PlusIcon } from "lucide-react";
import { generateLoadOrganizationMembersQueryOptions } from "@/features/organization/actions/queries";
import { generateCheckOrganizationPermissionsQueryOptions } from "@/features/authorization/actions/queries";
import { OrgMembersTable } from "@/features/organization/components";
import { cast } from "@/domain/shared/ids";
import type { OrgId } from "@/domain/shared/ids";

export const Route = createFileRoute("/_authenticated/$slug/orgs/$orgId/members")({
  loader: async ({ params, context }) => {
    const event = context.activeEvent;
    await Promise.all([
      context.queryClient.ensureQueryData(
        generateLoadOrganizationMembersQueryOptions(event.id, params.orgId),
      ),
      context.queryClient.ensureQueryData(
        generateCheckOrganizationPermissionsQueryOptions(event.id, params.orgId),
      ),
    ]);
  },
  component: OrganizationMembersPage,
});

function OrganizationMembersPage() {
  const { slug, orgId } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();
  const { data: members } = useSuspenseQuery(
    generateLoadOrganizationMembersQueryOptions(event.id, orgId),
  );
  const { data: permissions } = useSuspenseQuery(
    generateCheckOrganizationPermissionsQueryOptions(event.id, orgId),
  );

  const canManageMembers = permissions.canManageMembers;

  return (
    <>
      <Stack gap="6">
        <Flex justify="space-between" align="center">
          <Heading as="h2" textStyle="xl" fontWeight="semibold">
            メンバー管理
          </Heading>
          {canManageMembers && (
            <Button asChild>
              <Link to="/$slug/orgs/$orgId/members/new" params={{ slug, orgId }}>
                <PlusIcon />
                メンバーを追加
              </Link>
            </Button>
          )}
        </Flex>

        <OrgMembersTable
          members={members}
          eventId={event.id}
          orgId={cast<OrgId>(orgId)}
          canManageMembers={canManageMembers}
        />
      </Stack>
      <Outlet />
    </>
  );
}
