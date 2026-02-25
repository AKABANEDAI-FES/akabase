import { Code, Table } from "@/components/ui";
import { CommitteeRoleSelect } from "./committee-role-select";
import type { CommitteeRole } from "@/domain/authorization/schema";
import type { EventId, UserId } from "@/domain/shared/ids";

interface User {
  id: UserId;
  name: string;
  email: string;
  role: CommitteeRole;
}

interface EventUsersTableProps {
  users: User[];
  eventId: EventId;
  disabled?: boolean;
}

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
