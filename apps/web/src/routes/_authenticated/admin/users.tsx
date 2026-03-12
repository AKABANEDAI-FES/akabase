import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { generateLoadUsersWithRolesQueryOptions } from "@/features/user/actions/queries";
import { GlobalRoleSelect } from "@/features/user/components/global-role-select";
import { Code } from "@archive/ui/components/code";
import { Heading } from "@archive/ui/components/heading";
import { Table } from "@archive/ui/components/table";
import { Container, Flex, Stack } from "@archive/styled-system/jsx";
import { FormatDate } from "@/libs/date";

export const Route = createFileRoute("/_authenticated/admin/users")({
  loader: async ({ context }) =>
    context.queryClient.ensureQueryData(generateLoadUsersWithRolesQueryOptions()),
  component: UserListPage,
});

function UserListPage() {
  const { data: users } = useSuspenseQuery(generateLoadUsersWithRolesQueryOptions());

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <Flex justify="space-between" align="center">
          <Heading as="h1" textStyle="2xl" fontWeight="bold">
            ユーザー管理
          </Heading>
        </Flex>

        {users.length === 0 ? (
          <p>ユーザーがいません。</p>
        ) : (
          <Table.Root>
            <Table.Head>
              <Table.Row>
                <Table.Header>名前</Table.Header>
                <Table.Header>メールアドレス</Table.Header>
                <Table.Header>グローバルロール</Table.Header>
                <Table.Header>作成日</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {users.map((user) => (
                <Table.Row key={user.id}>
                  <Table.Cell>{user.name}</Table.Cell>
                  <Table.Cell>
                    <Code size="sm">{user.email}</Code>
                  </Table.Cell>
                  <Table.Cell>
                    <GlobalRoleSelect userId={user.id} currentRole={user.globalRole} />
                  </Table.Cell>
                  <Table.Cell>
                    <FormatDate value={user.createdAt} option={{ dateStyle: "medium" }} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Stack>
    </Container>
  );
}
