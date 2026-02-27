import { IconButton, Table } from "@/components/ui";
import { Flex } from "styled-system/jsx";
import { PencilIcon, Trash2Icon } from "lucide-react";
import type { EventId } from "@/domain/shared/ids";
import type { DeadlineListItem } from "@/application/query/event/list-deadlines";
import { DEADLINE_FIELD_LABELS } from "@/domain/event/schema";
import type { DeadlineFieldKey } from "@/domain/event/schema";
import { EditDeadlineDialog } from "./edit-deadline-dialog";
import { DeleteDeadlineDialog } from "./delete-deadline-dialog";

interface DeadlineManagementTableProps {
  deadlines: DeadlineListItem[];
  eventId: EventId;
  canUpdate?: boolean;
  canDelete?: boolean;
}

/**
 * Deadline management table component with CRUD operations
 */
export function DeadlineManagementTable({
  deadlines,
  eventId,
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
                  {DEADLINE_FIELD_LABELS[deadline.fieldKey as DeadlineFieldKey] ||
                    deadline.fieldKey}
                </Table.Cell>
                <Table.Cell>
                  {deadline.startAt ? (
                    new Date(deadline.startAt).toLocaleString("ja-JP", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  ) : (
                    <span style={{ color: "gray" }}>制限なし</span>
                  )}
                </Table.Cell>
                <Table.Cell>
                  {new Date(deadline.deadlineAt).toLocaleString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Table.Cell>
                <Table.Cell>{new Date(deadline.createdAt).toLocaleDateString("ja-JP")}</Table.Cell>
                {showActions && (
                  <Table.Cell>
                    <Flex gap="2">
                      {canUpdate && (
                        <EditDeadlineDialog eventId={eventId} deadline={deadline}>
                          <IconButton aria-label="編集" variant="plain" size="sm">
                            <PencilIcon />
                          </IconButton>
                        </EditDeadlineDialog>
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
