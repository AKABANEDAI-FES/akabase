import type { ReactNode } from "react";
import { Result } from "@praha/byethrow";
import { useDialogContext } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";
import { Button, CloseButton, Dialog, toaster } from "@/components/ui";
import { useRemoveOrganizationMemberMutation } from "@/features/organization/actions/mutations";
import type { EventId, OrgId, UserId } from "@/domain/shared/ids";

interface RemoveMemberDialogProps {
  eventId: EventId;
  orgId: OrgId;
  userId: UserId;
  userName: string;
  children: ReactNode;
}

export function RemoveMemberDialog({
  eventId,
  orgId,
  userId,
  userName,
  children,
}: RemoveMemberDialogProps) {
  return (
    <Dialog.Root size="sm" role="alertdialog">
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <RemoveMemberDialogContent
            eventId={eventId}
            orgId={orgId}
            userId={userId}
            userName={userName}
          />
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function RemoveMemberDialogContent({
  eventId,
  orgId,
  userId,
  userName,
}: {
  eventId: EventId;
  orgId: OrgId;
  userId: UserId;
  userName: string;
}) {
  const dialog = useDialogContext();
  const { mutateAsync, isPending } = useRemoveOrganizationMemberMutation();

  const handleRemove = async () => {
    try {
      const result = await mutateAsync({ data: { eventId, orgId, userId } });

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
        title: "メンバーを削除しました",
        description: `「${userName}」を出展団体から削除しました`,
      });
      dialog.setOpen(false);
    } catch (error) {
      console.error("Failed to remove member:", error);
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
        <Dialog.Title>メンバーを削除</Dialog.Title>
        <Dialog.Description>
          本当に「{userName}」をこの出展団体から削除しますか？
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer>
        <Dialog.ActionTrigger asChild>
          <Button type="button" variant="outline" disabled={isPending}>
            キャンセル
          </Button>
        </Dialog.ActionTrigger>
        <Button type="button" colorPalette="red" loading={isPending} onClick={handleRemove}>
          削除
        </Button>
      </Dialog.Footer>
      <Dialog.CloseTrigger asChild>
        <CloseButton />
      </Dialog.CloseTrigger>
    </Dialog.Content>
  );
}
