import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button, Heading, Table } from "@/components/ui";
import { Container, Flex, Stack } from "styled-system/jsx";
import { PlusIcon } from "lucide-react";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions";
import { generateLoadOrganizationsQueryOptions } from "@/features/organization/actions";

export const Route = createFileRoute("/_authenticated/$slug/committee/organizations")({
  loader: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    await context.queryClient.ensureQueryData(generateLoadOrganizationsQueryOptions(event.id));
  },
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));
  const { data: organizations } = useSuspenseQuery(generateLoadOrganizationsQueryOptions(event.id));

  // TODO: 委員会管理者かどうかの判定が必要（現状はボタンを常に表示）
  // 将来実装: isCommitteeAdmin(actor, eventId) ヘルパー関数

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <Flex justify="space-between" align="center">
          <Heading as="h1" textStyle="2xl" fontWeight="bold">
            団体一覧
          </Heading>
          <Link to="/$slug/committee/organizations/new" params={{ slug }}>
            <Button>
              <PlusIcon />
              団体を作成
            </Button>
          </Link>
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
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {organizations.map((org) => (
                <Table.Row key={org.id}>
                  <Table.Cell fontWeight="medium">{org.name}</Table.Cell>
                  <Table.Cell>{org.description || "—"}</Table.Cell>
                  <Table.Cell>{new Date(org.createdAt).toLocaleDateString("ja-JP")}</Table.Cell>
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
