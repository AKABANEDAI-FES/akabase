import { IconButton, Table } from "@/components/ui";
import { Flex } from "styled-system/jsx";
import { PencilIcon, Trash2Icon } from "lucide-react";
import type { EventId } from "@/domain/shared/ids";
import type { TagListItem } from "@/application/query/event/list-tags";
import { EditTagDialog } from "./edit-tag-dialog";
import { DeleteTagDialog } from "./delete-tag-dialog";

interface TagManagementTableProps {
  tags: TagListItem[];
  eventId: EventId;
}

/**
 * Tag management table component with CRUD operations
 */
export function TagManagementTable({ tags, eventId }: TagManagementTableProps) {
  return (
    <>
      {tags.length === 0 ? (
        <p>タグがまだありません。新しいタグを追加してください。</p>
      ) : (
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>タグ名</Table.Header>
              <Table.Header>作成日</Table.Header>
              <Table.Header>操作</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {tags.map((tag) => (
              <Table.Row key={tag.id}>
                <Table.Cell fontWeight="medium">{tag.name}</Table.Cell>
                <Table.Cell>{new Date(tag.createdAt).toLocaleDateString("ja-JP")}</Table.Cell>
                <Table.Cell>
                  <Flex gap="2">
                    <EditTagDialog eventId={eventId} tag={tag}>
                      <IconButton aria-label="編集" variant="plain" size="sm">
                        <PencilIcon />
                      </IconButton>
                    </EditTagDialog>
                    <DeleteTagDialog eventId={eventId} tag={tag}>
                      <IconButton aria-label="削除" variant="plain" size="sm" colorPalette="red">
                        <Trash2Icon />
                      </IconButton>
                    </DeleteTagDialog>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </>
  );
}
