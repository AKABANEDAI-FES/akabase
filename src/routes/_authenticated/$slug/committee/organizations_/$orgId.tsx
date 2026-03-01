import { Link, Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Container, Stack } from "styled-system/jsx";
import { Button, Heading, SegmentGroup } from "@/components/ui";
import { ArrowLeftIcon } from "lucide-react";
import { generateLoadOrganizationDetailQueryOptions } from "@/features/organization/actions";

export const Route = createFileRoute("/_authenticated/$slug/committee/organizations_/$orgId")({
  loader: async ({ params, context }) => {
    const event = context.activeEvent;
    await context.queryClient.ensureQueryData(
      generateLoadOrganizationDetailQueryOptions(event.id, params.orgId),
    );
  },
  component: EditOrganizationPage,
});

function EditOrganizationPage() {
  const location = useLocation();
  const { slug, orgId } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();
  const { data: organization } = useSuspenseQuery(
    generateLoadOrganizationDetailQueryOptions(event.id, orgId),
  );

  const currentTab = location.pathname.includes("/projects")
    ? "projects"
    : location.pathname.includes("/members")
      ? "members"
      : "organization";

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <div>
          <Button variant="plain" size="sm" mb="4" asChild>
            <Link to="/$slug/committee/organizations" params={{ slug }}>
              <ArrowLeftIcon />
              出展団体一覧に戻る
            </Link>
          </Button>
          <Stack gap="2">
            <Heading as="h1" textStyle="2xl" fontWeight="bold">
              {organization.name}
            </Heading>
          </Stack>
        </div>

        <SegmentGroup.Root value={currentTab} variant="line">
          <SegmentGroup.Indicator />
          <SegmentGroup.Item value="organization" asChild>
            <Link to="/$slug/committee/organizations/$orgId" params={{ slug, orgId }}>
              <SegmentGroup.ItemText>基本情報</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </Link>
          </SegmentGroup.Item>
          <SegmentGroup.Item value="members" asChild>
            <Link to="/$slug/committee/organizations/$orgId/members" params={{ slug, orgId }}>
              <SegmentGroup.ItemText>メンバー</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </Link>
          </SegmentGroup.Item>
          <SegmentGroup.Item value="projects" asChild>
            <Link to="/$slug/committee/organizations/$orgId/projects" params={{ slug, orgId }}>
              <SegmentGroup.ItemText>企画一覧</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </Link>
          </SegmentGroup.Item>
        </SegmentGroup.Root>

        <Outlet />
      </Stack>
    </Container>
  );
}
