import type { ReactNode } from "react";
import { Result } from "@akabase/result";
import { useDialogContext } from "@ark-ui/react/dialog";
import { Button } from "@akabase/ui/components/button";
import { CloseButton } from "@akabase/ui/components/close-button";
import { Dialog } from "@akabase/ui/components/dialog";
import { toaster } from "@akabase/ui/components/toast";
import { Portal } from "@ark-ui/react/portal";
import { DEADLINE_FIELD_LABELS } from "@akabase/domain/event/schema";
import type { EventId } from "@akabase/domain/event/schema";
import type { DeadlineListItem } from "@akabase/application/query/event/list-deadlines";
import { useMutation } from "@tanstack/react-query";
import { useDeleteDeadlineMutationOption } from "../actions/mutations/deadline";

type DeleteDeadlineDialogProps = {
  eventId: EventId;
  deadline: DeadlineListItem;
  children: ReactNode;
};

export function DeleteDeadlineDialog({ eventId, deadline, children }: DeleteDeadlineDialogProps) {
  return (
    <Dialog.Root size="sm" role="alertdialog">
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <DeleteDeadlineDialogContent eventId={eventId} deadline={deadline} />
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function DeleteDeadlineDialogContent({
  eventId,
  deadline,
}: {
  eventId: EventId;
  deadline: DeadlineListItem;
}) {
  const dialog = useDialogContext();
  const { mutateAsync, isPending } = useMutation(useDeleteDeadlineMutationOption());

  const fieldLabel = DEADLINE_FIELD_LABELS[deadline.fieldKey] || deadline.fieldKey;

  const handleDelete = async () => {
    try {
      const result = await mutateAsync({ data: { deadlineId: deadline.id, eventId } });

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
        title: "締切を削除しました",
        description: `「${fieldLabel}」の締切を削除しました`,
      });
      dialog.setOpen(false);
    } catch (error) {
      console.error("Failed to delete deadline:", error);
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
        <Dialog.Title>締切を削除</Dialog.Title>
        <Dialog.Description>
          本当に「{fieldLabel}」の締切を削除しますか？この操作は取り消せません。
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
