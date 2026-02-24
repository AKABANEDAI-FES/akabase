import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { generateLoadUsersWithRolesQueryOptions } from "@/features/user/actions";
import { GlobalRoleSelect } from "@/features/user/components";
import { Code, Heading, Table } from "@/components/ui";
import { Container, Flex, Stack } from "styled-system/jsx";

export const Route = createFileRoute("/admin/users")({
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
                  <Table.Cell>{new Date(user.createdAt).toLocaleDateString("ja-JP")}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Stack>
    </Container>
  );
}
