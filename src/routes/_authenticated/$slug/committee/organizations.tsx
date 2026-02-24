import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button, Heading, Table } from "@/components/ui";
import { Container, Flex, Stack } from "styled-system/jsx";
import { PlusIcon } from "lucide-react";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions";
import { generateLoadOrganizationsQueryOptions } from "@/features/organization/actions";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions";

export const Route = createFileRoute("/_authenticated/$slug/committee/organizations")({
  loader: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadOrganizationsQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateCheckCommitteePermissionsQueryOptions(event.id)),
    ]);
  },
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));
  const { data: organizations } = useSuspenseQuery(generateLoadOrganizationsQueryOptions(event.id));
  const { data: permissions } = useSuspenseQuery(
    generateCheckCommitteePermissionsQueryOptions(event.id),
  );

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <Flex justify="space-between" align="center">
          <Heading as="h1" textStyle="2xl" fontWeight="bold">
            団体一覧
          </Heading>
          {permissions.canCreateOrganization && (
            <Link to="/$slug/committee/organizations/new" params={{ slug }}>
              <Button>
                <PlusIcon />
                団体を作成
              </Button>
            </Link>
          )}
        </Flex>

        {organizations.length === 0 ? (
          <p>団体がまだありません。新しい団体を作成してください。</p>
        ) : (
          <Table.Root>
            <Table.Head>
              <Table.Row>
                <Table.Header>団体名</Table.Header>
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
                  <Table.Cell>{new Date(org.createdAt).toLocaleDateString("ja-JP")}</Table.Cell>
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
