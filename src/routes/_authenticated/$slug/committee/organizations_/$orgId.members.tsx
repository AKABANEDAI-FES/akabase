import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HStack, Stack } from "styled-system/jsx";
import { UserPlusIcon } from "lucide-react";
import {
  generateLoadOrganizationDetailQueryOptions,
  generateLoadOrganizationMembersQueryOptions,
} from "@/features/organization/actions";
import { generateCheckCanManageOrgMembersQueryOptions } from "@/features/authorization/actions";
import { OrgMembersTable } from "@/features/organization/components/org-members-table";
import { Button, Text } from "@/components/ui";
import { cast } from "@/domain/shared/ids";
import type { OrgId } from "@/domain/shared/ids";

export const Route = createFileRoute(
  "/_authenticated/$slug/committee/organizations_/$orgId/members",
)({
  loader: async ({ params, context }) => {
    const organization = await context.queryClient.ensureQueryData(
      generateLoadOrganizationDetailQueryOptions(params.orgId),
    );
    await Promise.all([
      context.queryClient.ensureQueryData(
        generateLoadOrganizationMembersQueryOptions(params.orgId),
      ),
      context.queryClient.ensureQueryData(
        generateCheckCanManageOrgMembersQueryOptions(params.orgId, organization.eventId),
      ),
    ]);
  },
  component: OrganizationMembersPage,
});

function OrganizationMembersPage() {
  const { slug, orgId } = Route.useParams();
  const { data: organization } = useSuspenseQuery(
    generateLoadOrganizationDetailQueryOptions(orgId),
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
  eventId: string;
}) {
  const { data: members } = useSuspenseQuery(generateLoadOrganizationMembersQueryOptions(orgId));
  const { data: authCheck } = useSuspenseQuery(
    generateCheckCanManageOrgMembersQueryOptions(orgId, eventId),
  );

  return (
    <>
      <Stack gap="4">
        <HStack justify="space-between" alignItems="center">
          <Text color="fg.muted" textStyle="sm">
            マネージャーは企画の提出やメンバーの管理ができます。エディターは企画の編集のみ可能です。
          </Text>
          {authCheck.canManageMembers && (
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
          orgId={orgId}
          canManageMembers={authCheck.canManageMembers}
        />
      </Stack>
      <Outlet />
    </>
  );
}
