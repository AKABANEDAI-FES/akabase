import { Code } from "@archive/ui/components/code";
import { Table } from "@archive/ui/components/table";
import { CommitteeRoleSelect } from "./committee-role-select";
import type { CommitteeRole } from "@archive/domain/authorization/schema";
import type { EventId } from "@archive/domain/event/schema";
import type { UserId } from "@archive/domain/user/schema";

type User = {
  id: UserId;
  name: string;
  email: string;
  role: CommitteeRole;
};

type EventUsersTableProps = {
  users: User[];
  eventId: EventId;
  disabled?: boolean;
};

export function EventUsersTable({ users, eventId, disabled }: EventUsersTableProps) {
  return (
    <Table.Root>
      <Table.Head>
        <Table.Row>
          <Table.Header>名前</Table.Header>
          <Table.Header>メールアドレス</Table.Header>
          <Table.Header>委員会ロール</Table.Header>
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
              <CommitteeRoleSelect
                userId={user.id}
                eventId={eventId}
                currentRole={user.role}
                disabled={disabled}
              />
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
