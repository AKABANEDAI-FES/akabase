import { useOptimistic, useTransition } from "react";
import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { IconButton, Table, toaster } from "@/components/ui";
import { Flex } from "@archive/styled-system/jsx";
import { GripVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Result } from "@praha/byethrow";
import type { EventId, TagId } from "@/domain/shared/ids";
import type { TagListItem } from "@/application/query/event/list-tags";
import { DeleteTagDialog } from "./delete-tag-dialog";
import { FormatDate } from "@/libs/date";
import { useReorderTagsMutation } from "@/features/event/actions/mutations/tag";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { css } from "@archive/styled-system/css";
import { useQueryClient } from "@tanstack/react-query";
import { generateLoadTagsQueryOptions } from "../actions";

interface TagManagementTableProps {
  tags: TagListItem[];
  eventId: EventId;
  slug: string;
  canUpdate?: boolean;
  canDelete?: boolean;
}

function DragHandle({ tagId }: { tagId: string }) {
  const { attributes, listeners } = useSortable({ id: tagId });
  return (
    <button
      aria-label="並び替え"
      className={css({
        cursor: "grab",
        h: "9",
        display: "inline-grid",
        placeItems: "center",
        _icon: {
          boxSize: "4",
        },
      })}
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon />
    </button>
  );
}

function SortableRow({
  tag,
  slug,
  eventId,
  canUpdate,
  canDelete,
  showActions,
}: {
  tag: TagListItem;
  slug: string;
  eventId: EventId;
  canUpdate?: boolean;
  canDelete?: boolean;
  showActions: boolean;
}) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({ id: tag.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  };

  return (
    <Table.Row ref={setNodeRef} style={style}>
      {canUpdate && (
        <Table.Cell maxW="fit-content">
          <DragHandle tagId={tag.id} />
        </Table.Cell>
      )}
      <Table.Cell fontWeight="medium">{tag.name}</Table.Cell>
      <Table.Cell>
        <FormatDate value={tag.createdAt} option={{ dateStyle: "medium" }} />
      </Table.Cell>
      {showActions && (
        <Table.Cell>
          <Flex gap="2">
            {canUpdate && (
              <IconButton aria-label="編集" variant="plain" size="sm" asChild>
                <Link to="/$slug/committee/tags/$tagId/edit" params={{ slug, tagId: tag.id }}>
                  <PencilIcon />
                </Link>
              </IconButton>
            )}
            {canDelete && (
              <DeleteTagDialog eventId={eventId} tag={tag}>
                <IconButton aria-label="削除" variant="plain" size="sm" colorPalette="red">
                  <Trash2Icon />
                </IconButton>
              </DeleteTagDialog>
            )}
          </Flex>
        </Table.Cell>
      )}
    </Table.Row>
  );
}

/**
 * Tag management table component with CRUD operations and drag-and-drop reordering
 */
export function TagManagementTable({
  tags,
  eventId,
  slug,
  canUpdate,
  canDelete,
}: TagManagementTableProps) {
  const showActions = canUpdate || canDelete;
  const [optimisticTags, setOptimisticTags] = useOptimistic(tags);
  const [, startTransition] = useTransition();
  const { mutateAsync: reorderMutate } = useReorderTagsMutation();
  const queryClient = useQueryClient();

  const tagIds = optimisticTags.map((t) => t.id);

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;

    const oldIndex = tagIds.indexOf(active.id as TagId);
    const newIndex = tagIds.indexOf(over.id as TagId);
    const newTags = arrayMove(optimisticTags, oldIndex, newIndex);

    startTransition(async () => {
      setOptimisticTags(newTags);

      const result = await reorderMutate({
        data: {
          eventId,
          tagIds: newTags.map((t) => t.id),
        },
      });

      if (Result.isFailure(result)) {
        await queryClient.invalidateQueries(generateLoadTagsQueryOptions(eventId));
        toaster.create({
          type: "error",
          title: "エラー",
          description: result.error.message,
        });
      }
    });
  }

  if (tags.length === 0) {
    return <p>タグがまだありません。新しいタグを追加してください。</p>;
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <Table.Root>
        <Table.Head>
          <Table.Row>
            {canUpdate && <Table.Header width="1" />}
            <Table.Header>タグ名</Table.Header>
            <Table.Header>作成日</Table.Header>
            {showActions && <Table.Header>操作</Table.Header>}
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <SortableContext items={tagIds} strategy={verticalListSortingStrategy}>
            {optimisticTags.map((tag) => (
              <SortableRow
                key={tag.id}
                tag={tag}
                slug={slug}
                eventId={eventId}
                canUpdate={canUpdate}
                canDelete={canDelete}
                showActions={!!showActions}
              />
            ))}
          </SortableContext>
        </Table.Body>
      </Table.Root>
    </DndContext>
  );
}
