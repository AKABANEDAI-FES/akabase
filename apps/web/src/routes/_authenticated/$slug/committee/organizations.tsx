import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@archive/ui/components/button";
import { Heading } from "@archive/ui/components/heading";
import { Table } from "@archive/ui/components/table";
import { Container, Flex, Stack } from "@archive/styled-system/jsx";
import { PlusIcon } from "lucide-react";
import { generateLoadOrganizationsQueryOptions } from "@/features/organization/actions/queries";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions/queries";
import { FormatDate } from "@/libs/date";

export const Route = createFileRoute("/_authenticated/$slug/committee/organizations")({
  loader: async ({ context }) => {
    const event = context.activeEvent;
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadOrganizationsQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateCheckCommitteePermissionsQueryOptions(event.id)),
    ]);
  },
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const { slug } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();
  const { data: organizations } = useSuspenseQuery(generateLoadOrganizationsQueryOptions(event.id));
  const { data: permissions } = useSuspenseQuery(
    generateCheckCommitteePermissionsQueryOptions(event.id),
  );

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <Flex justify="space-between" align="center">
          <Heading as="h1" textStyle="2xl" fontWeight="bold">
            出展団体一覧
          </Heading>
          {permissions.canCreateOrganization && (
            <Link to="/$slug/committee/organizations/new" params={{ slug }}>
              <Button>
                <PlusIcon />
                出展団体を作成
              </Button>
            </Link>
          )}
        </Flex>

        {organizations.length === 0 ? (
          <p>出展団体がまだありません。新しい出展団体を作成してください。</p>
        ) : (
          <Table.Root>
            <Table.Head>
              <Table.Row>
                <Table.Header>出展団体名</Table.Header>
                <Table.Header>説明</Table.Header>
                <Table.Header>作成日</Table.Header>
                <Table.Header />
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {organizations.map((org) => (
                <Table.Row key={org.id}>
                  <Table.Cell fontWeight="medium">{org.name}</Table.Cell>
                  <Table.Cell>{org.description || "—"}</Table.Cell>
                  <Table.Cell>
                    <FormatDate value={org.createdAt} option={{ dateStyle: "medium" }} />
                  </Table.Cell>
                  <Table.Cell>
                    <Button variant="plain" size="sm" asChild>
                      <Link
                        to="/$slug/committee/organizations/$orgId"
                        params={{ slug, orgId: org.id }}
                      >
                        詳細
                      </Link>
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Stack>
      <Outlet />
    </Container>
  );
}
