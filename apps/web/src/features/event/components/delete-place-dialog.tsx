import type { ReactNode } from "react";
import { Result } from "@archive/result";
import { Button } from "@archive/ui/components/button";
import { CloseButton } from "@archive/ui/components/close-button";
import { Dialog } from "@archive/ui/components/dialog";
import { toaster } from "@archive/ui/components/toast";
import { Portal } from "@ark-ui/react/portal";
import { useDialogContext } from "@ark-ui/react/dialog";
import type { EventId } from "@archive/domain/event/schema";
import type { PlaceListItem } from "@archive/application/query/event/list-places";
import { useMutation } from "@tanstack/react-query";
import { useDeletePlaceMutationOption } from "../actions/mutations/place";

type DeletePlaceDialogProps = {
  eventId: EventId;
  place: PlaceListItem;
  children: ReactNode;
};

/**
 * Delete place confirmation dialog with Trigger pattern
 */
export function DeletePlaceDialog({ eventId, place, children }: DeletePlaceDialogProps) {
  return (
    <Dialog.Root size="sm" role="alertdialog">
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <DeletePlaceDialogContent eventId={eventId} place={place} />
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function DeletePlaceDialogContent({ eventId, place }: { eventId: EventId; place: PlaceListItem }) {
  const dialog = useDialogContext();
  const { mutateAsync, isPending } = useMutation(useDeletePlaceMutationOption());

  const handleDelete = async () => {
    try {
      const result = await mutateAsync({ data: { placeId: place.id, eventId } });

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
        title: "場所を削除しました",
        description: `「${place.name}」を削除しました`,
      });
      dialog.setOpen(false);
    } catch (error) {
      console.error("Failed to delete place:", error);
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
        <Dialog.Title>場所を削除</Dialog.Title>
        <Dialog.Description>
          本当に「{place.name}
          」を削除しますか？この場所の子要素もすべて削除されます。この操作は取り消せません。
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
