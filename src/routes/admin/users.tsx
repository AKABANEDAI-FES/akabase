import { createFileRoute } from "@tanstack/react-router";
import { loadUsersWithRolesFn } from "@/features/user/actions";
import { GlobalRoleSelect } from "@/features/user/components";
import { Code, Table } from "@/components/ui";
import { css } from "styled-system/css";
import { Flex, Stack } from "styled-system/jsx";

export const Route = createFileRoute("/admin/users")({
  loader: async () => {
    const users = await loadUsersWithRolesFn();

    return {
      users,
    };
  },
  component: UserListPage,
});

function UserListPage() {
  const { users } = Route.useLoaderData();

  return (
    <div className={css({ padding: "8", maxWidth: "1400px", margin: "0 auto" })}>
      <Stack gap="6">
        <Flex justify="space-between" align="center">
          <h1 className={css({ fontSize: "2xl", fontWeight: "bold" })}>ユーザー管理</h1>
        </Flex>

        {users.length === 0 ? (
          <div className={css({ padding: "8", textAlign: "center", color: "gray.500" })}>
            ユーザーがいません。
          </div>
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
    </div>
  );
}
