import { Trash2Icon } from "lucide-react";
import { Code } from "@akabase/ui/components/code";
import { IconButton } from "@akabase/ui/components/icon-button";
import { Table } from "@akabase/ui/components/table";
import { OrgMemberRoleSelect } from "./org-member-role-select";
import { RemoveMemberDialog } from "./remove-member-dialog";
import type { OrgId, OrgMemberRole } from "@akabase/domain/organization/schema";
import { ORG_ROLE_LABELS } from "@akabase/domain/authorization/roles";
import type { EventId } from "@akabase/domain/event/schema";
import type { UserId } from "@akabase/domain/user/schema";

type Member = {
  id: string;
  userId: UserId;
  name: string;
  email: string;
  role: OrgMemberRole;
};

type OrgMembersTableProps = {
  members: Member[];
  eventId: EventId;
  orgId: OrgId;
  canManageMembers: boolean;
};

export function OrgMembersTable({
  members,
  eventId,
  orgId,
  canManageMembers,
}: OrgMembersTableProps) {
  if (members.length === 0) {
    return <p>メンバーがいません。</p>;
  }

  return (
    <Table.Root>
      <Table.Head>
        <Table.Row>
          <Table.Header>名前</Table.Header>
          <Table.Header>メールアドレス</Table.Header>
          <Table.Header>ロール</Table.Header>
          {canManageMembers && <Table.Header />}
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {members.map((member) => (
          <Table.Row key={member.userId}>
            <Table.Cell>{member.name}</Table.Cell>
            <Table.Cell>
              <Code size="sm">{member.email}</Code>
            </Table.Cell>
            <Table.Cell>
              {canManageMembers ? (
                <OrgMemberRoleSelect
                  eventId={eventId}
                  orgId={orgId}
                  userId={member.userId}
                  currentRole={member.role}
                />
              ) : (
                ORG_ROLE_LABELS[member.role]
              )}
            </Table.Cell>
            {canManageMembers && (
              <Table.Cell>
                <RemoveMemberDialog
                  eventId={eventId}
                  orgId={orgId}
                  userId={member.userId}
                  userName={member.name}
                >
                  <IconButton variant="outline" colorPalette="red" size="sm">
                    <Trash2Icon />
                  </IconButton>
                </RemoveMemberDialog>
              </Table.Cell>
            )}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
