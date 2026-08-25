import type { ReactNode } from "react";
import { Result } from "@akabase/result";
import { useDialogContext } from "@ark-ui/react/dialog";
import { Button } from "@akabase/ui/components/button";
import { CloseButton } from "@akabase/ui/components/close-button";
import { Dialog } from "@akabase/ui/components/dialog";
import { toaster } from "@akabase/ui/components/toast";
import { Portal } from "@ark-ui/react/portal";
import type { EventId } from "@akabase/domain/event/schema";
import type { ProjectCategoryListItem } from "@akabase/application/query/event/list-project-categories";
import { useMutation } from "@tanstack/react-query";
import { useDeleteProjectCategoryMutationOption } from "../actions/mutations/project-category";

type DeleteProjectCategoryDialogProps = {
  eventId: EventId;
  category: ProjectCategoryListItem;
  children: ReactNode;
};

export function DeleteProjectCategoryDialog({
  eventId,
  category,
  children,
}: DeleteProjectCategoryDialogProps) {
  return (
    <Dialog.Root size="sm" role="alertdialog">
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <DeleteProjectCategoryDialogContent eventId={eventId} category={category} />
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function DeleteProjectCategoryDialogContent({
  eventId,
  category,
}: {
  eventId: EventId;
  category: ProjectCategoryListItem;
}) {
  const dialog = useDialogContext();
  const { mutateAsync, isPending } = useMutation(useDeleteProjectCategoryMutationOption());

  const handleDelete = async () => {
    try {
      const result = await mutateAsync({ data: { categoryId: category.id, eventId } });

      if (Result.isFailure(result)) {
        toaster.create({
          type: "error",
          title: "エラー",
          description: result.error.message,
        });
        return;
      }

      toaster.create({
        type: "success",
        title: "企画区分を削除しました",
        description: `「${category.name}」を削除しました`,
      });
      dialog.setOpen(false);
    } catch (error) {
      console.error("Failed to delete project category:", error);
      toaster.create({
        type: "error",
        title: "エラー",
        description: "予期しないエラーが発生しました",
      });
    }
  };

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>企画区分を削除</Dialog.Title>
        <Dialog.Description>
          {category.projectCount > 0
            ? `本当に「${category.name}」を削除しますか？この企画区分には${category.projectCount}件の企画が紐づいており、削除するとこれらの企画は未分類になります。この操作は取り消せません。`
            : `本当に「${category.name}」を削除しますか？この操作は取り消せません。`}
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer>
        <Dialog.ActionTrigger asChild>
          <Button type="button" variant="outline" disabled={isPending}>
            キャンセル
          </Button>
        </Dialog.ActionTrigger>
        <Button type="button" colorPalette="red" loading={isPending} onClick={handleDelete}>
          削除
        </Button>
      </Dialog.Footer>
      <Dialog.CloseTrigger asChild>
        <CloseButton />
      </Dialog.CloseTrigger>
    </Dialog.Content>
  );
}
