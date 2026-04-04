import type { ReactNode } from "react";
import { Result } from "@akabase/result";
import { useDialogContext } from "@ark-ui/react/dialog";
import { Button } from "@akabase/ui/components/button";
import { CloseButton } from "@akabase/ui/components/close-button";
import { Dialog } from "@akabase/ui/components/dialog";
import { toaster } from "@akabase/ui/components/toast";
import { Portal } from "@ark-ui/react/portal";
import type { EventId } from "@akabase/domain/event/schema";
import type { TagListItem } from "@akabase/application/query/event/list-tags";
import { useMutation } from "@tanstack/react-query";
import { useDeleteTagMutationOption } from "../actions/mutations/tag";

type DeleteTagDialogProps = {
  eventId: EventId;
  tag: TagListItem;
  children: ReactNode;
};

export function DeleteTagDialog({ eventId, tag, children }: DeleteTagDialogProps) {
  return (
    <Dialog.Root size="sm" role="alertdialog">
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <DeleteTagDialogContent eventId={eventId} tag={tag} />
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function DeleteTagDialogContent({ eventId, tag }: { eventId: EventId; tag: TagListItem }) {
  const dialog = useDialogContext();
  const { mutateAsync, isPending } = useMutation(useDeleteTagMutationOption());

  const handleDelete = async () => {
    try {
      const result = await mutateAsync({ data: { tagId: tag.id, eventId } });

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
        title: "タグを削除しました",
        description: `「${tag.name}」を削除しました`,
      });
      dialog.setOpen(false);
    } catch (error) {
      console.error("Failed to delete tag:", error);
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
        <Dialog.Title>タグを削除</Dialog.Title>
        <Dialog.Description>
          本当に「{tag.name}」を削除しますか？この操作は取り消せません。
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
