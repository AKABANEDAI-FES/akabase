import { Link, Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Container, Stack } from "@archive/styled-system/jsx";
import { Heading } from "@archive/ui/components/heading";
import { SegmentGroup } from "@archive/ui/components/segment-group";
import { generateLoadOrganizationDetailQueryOptions } from "@/features/organization/actions/queries";
import { handleNotFoundError } from "@/libs/error";

export const Route = createFileRoute("/_authenticated/$slug/orgs/$orgId")({
  loader: async ({ params, context }) => {
    const event = context.activeEvent;
    await context.queryClient.ensureQueryData(
      generateLoadOrganizationDetailQueryOptions(event.id, params.orgId),
    );
  },
  component: OrganizationLayoutPage,
  onError: handleNotFoundError,
});

function OrganizationLayoutPage() {
  const location = useLocation();
  const { slug, orgId } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();
  const { data: organization } = useSuspenseQuery(
    generateLoadOrganizationDetailQueryOptions(event.id, orgId),
  );

  const currentTab = location.pathname.includes("/members") ? "members" : "overview";

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <Heading as="h1" textStyle="2xl" fontWeight="bold">
          {organization.name}
        </Heading>

        <SegmentGroup.Root value={currentTab} variant="line">
          <SegmentGroup.Indicator />
          <SegmentGroup.Item value="overview" asChild>
            <Link to="/$slug/orgs/$orgId" params={{ slug, orgId }}>
              <SegmentGroup.ItemText>企画一覧</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </Link>
          </SegmentGroup.Item>
          <SegmentGroup.Item value="members" asChild>
            <Link to="/$slug/orgs/$orgId/members" params={{ slug, orgId }}>
              <SegmentGroup.ItemText>メンバー</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </Link>
          </SegmentGroup.Item>
        </SegmentGroup.Root>

        <Outlet />
      </Stack>
    </Container>
  );
}
