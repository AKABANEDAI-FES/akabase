import { useOptimistic, useTransition } from "react";
import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { Result } from "@akabase/result";
import { IconButton } from "@akabase/ui/components/icon-button";
import { Table } from "@akabase/ui/components/table";
import { toaster } from "@akabase/ui/components/toast";
import { Flex } from "@akabase/styled-system/jsx";
import { GripVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import type { EventId, ProjectCategoryId } from "@akabase/domain/event/schema";
import type { ProjectCategoryListItem } from "@akabase/application/query/event/list-project-categories";
import { DeleteProjectCategoryDialog } from "./delete-project-category-dialog";
import { FormatDate } from "@/libs/date";
import { useReorderProjectCategoriesMutationOption } from "../actions/mutations/project-category";
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
import { css } from "@akabase/styled-system/css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generateLoadProjectCategoriesQueryOptions } from "../actions/queries/project-category";
import { cast } from "@akabase/domain/shared/ids";

type ProjectCategoryManagementTableProps = {
  categories: ProjectCategoryListItem[];
  eventId: EventId;
  slug: string;
  canUpdate?: boolean;
  canDelete?: boolean;
};

function DragHandle({ categoryId }: { categoryId: string }) {
  const { attributes, listeners } = useSortable({ id: categoryId });
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
  category,
  slug,
  eventId,
  canUpdate,
  canDelete,
  showActions,
}: {
  category: ProjectCategoryListItem;
  slug: string;
  eventId: EventId;
  canUpdate?: boolean;
  canDelete?: boolean;
  showActions: boolean;
}) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({ id: category.id });

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
          <DragHandle categoryId={category.id} />
        </Table.Cell>
      )}
      <Table.Cell fontWeight="medium">{category.name}</Table.Cell>
      <Table.Cell>{category.projectCount}</Table.Cell>
      <Table.Cell>
        <FormatDate value={category.createdAt} option={{ dateStyle: "medium" }} />
      </Table.Cell>
      {showActions && (
        <Table.Cell>
          <Flex gap="2">
            {canUpdate && (
              <IconButton aria-label="編集" variant="plain" size="sm" asChild>
                <Link
                  to="/$slug/committee/project-categories/$categoryId/edit"
                  params={{ slug, categoryId: category.id }}
                >
                  <PencilIcon />
                </Link>
              </IconButton>
            )}
            {canDelete && (
              <DeleteProjectCategoryDialog eventId={eventId} category={category}>
                <IconButton aria-label="削除" variant="plain" size="sm" colorPalette="red">
                  <Trash2Icon />
                </IconButton>
              </DeleteProjectCategoryDialog>
            )}
          </Flex>
        </Table.Cell>
      )}
    </Table.Row>
  );
}

/**
 * Project category management table component with CRUD operations and drag-and-drop reordering
 */
export function ProjectCategoryManagementTable({
  categories,
  eventId,
  slug,
  canUpdate,
  canDelete,
}: ProjectCategoryManagementTableProps) {
  const showActions = canUpdate || canDelete;
  const [optimisticCategories, setOptimisticCategories] = useOptimistic(categories);
  const [, startTransition] = useTransition();
  const { mutateAsync: reorderMutate } = useMutation(useReorderProjectCategoriesMutationOption());
  const queryClient = useQueryClient();

  const categoryIds = optimisticCategories.map((c) => c.id);

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) {
      return;
    }

    const oldIndex = categoryIds.indexOf(cast<ProjectCategoryId>(active.id.toString()));
    const newIndex = categoryIds.indexOf(cast<ProjectCategoryId>(over.id.toString()));
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newCategories = arrayMove(optimisticCategories, oldIndex, newIndex);

    startTransition(async () => {
      setOptimisticCategories(newCategories);

      try {
        const result = await reorderMutate({
          data: {
            eventId,
            categoryIds: newCategories.map((c) => c.id),
          },
        });

        if (Result.isFailure(result)) {
          await queryClient.invalidateQueries(generateLoadProjectCategoriesQueryOptions(eventId));
          toaster.create({
            type: "error",
            title: "エラー",
            description: result.error.message,
          });
        }
      } catch (error) {
        console.error("Failed to reorder project categories:", error);
        toaster.create({
          type: "error",
          title: "エラー",
          description: "予期しないエラーが発生しました",
        });
      }
    });
  }

  if (categories.length === 0) {
    return <p>企画区分がまだありません。新しい企画区分を追加してください。</p>;
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
            <Table.Header>企画区分名</Table.Header>
            <Table.Header>企画数</Table.Header>
            <Table.Header>作成日</Table.Header>
            {showActions && <Table.Header>操作</Table.Header>}
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
            {optimisticCategories.map((category) => (
              <SortableRow
                key={category.id}
                category={category}
                slug={slug}
                eventId={eventId}
                canUpdate={canUpdate}
                canDelete={canDelete}
                showActions={Boolean(showActions)}
              />
            ))}
          </SortableContext>
        </Table.Body>
      </Table.Root>
    </DndContext>
  );
}
