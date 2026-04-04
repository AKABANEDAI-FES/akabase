import { Link } from "@tanstack/react-router";
import { IconButton } from "@akabase/ui/components/icon-button";
import { Table } from "@akabase/ui/components/table";
import { Flex } from "@akabase/styled-system/jsx";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { DEADLINE_FIELD_LABELS } from "@akabase/domain/event/schema";
import type { EventId } from "@akabase/domain/event/schema";
import type { DeadlineListItem } from "@akabase/application/query/event/list-deadlines";
import { DeleteDeadlineDialog } from "./delete-deadline-dialog";
import { FormatDate } from "@/libs/date";

type DeadlineManagementTableProps = {
  deadlines: DeadlineListItem[];
  eventId: EventId;
  slug: string;
  canUpdate?: boolean;
  canDelete?: boolean;
};

/**
 * Deadline management table component with CRUD operations
 */
export function DeadlineManagementTable({
  deadlines,
  eventId,
  slug,
  canUpdate,
  canDelete,
}: DeadlineManagementTableProps) {
  const showActions = canUpdate || canDelete;

  return (
    <>
      {deadlines.length === 0 ? (
        <p>締切がまだありません。新しい締切を追加してください。</p>
      ) : (
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>フィールド</Table.Header>
              <Table.Header>開始日時</Table.Header>
              <Table.Header>終了日時</Table.Header>
              <Table.Header>作成日</Table.Header>
              {showActions && <Table.Header>操作</Table.Header>}
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {deadlines.map((deadline) => (
              <Table.Row key={deadline.id}>
                <Table.Cell fontWeight="medium">
                  {DEADLINE_FIELD_LABELS[deadline.fieldKey] || deadline.fieldKey}
                </Table.Cell>
                <Table.Cell>
                  {deadline.startAt ? (
                    <FormatDate
                      value={deadline.startAt}
                      option={{
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }}
                    />
                  ) : (
                    <span style={{ color: "gray" }}>制限なし</span>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <FormatDate
                    value={deadline.deadlineAt}
                    option={{
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }}
                  />
                </Table.Cell>
                <Table.Cell>
                  <FormatDate value={deadline.createdAt} option={{ dateStyle: "medium" }} />
                </Table.Cell>
                {showActions && (
                  <Table.Cell>
                    <Flex gap="2">
                      {canUpdate && (
                        <IconButton aria-label="編集" variant="plain" size="sm" asChild>
                          <Link
                            to="/$slug/committee/deadlines/$deadlineId/edit"
                            params={{ slug, deadlineId: deadline.id }}
                          >
                            <PencilIcon />
                          </Link>
                        </IconButton>
                      )}
                      {canDelete && (
                        <DeleteDeadlineDialog eventId={eventId} deadline={deadline}>
                          <IconButton
                            aria-label="削除"
                            variant="plain"
                            size="sm"
                            colorPalette="red"
                          >
                            <Trash2Icon />
                          </IconButton>
                        </DeleteDeadlineDialog>
                      )}
                    </Flex>
                  </Table.Cell>
                )}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </>
  );
}
