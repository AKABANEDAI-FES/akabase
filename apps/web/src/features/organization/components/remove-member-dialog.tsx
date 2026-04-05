import type { ReactNode } from "react";
import { Result } from "@akabase/result";
import { useDialogContext } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@akabase/ui/components/button";
import { CloseButton } from "@akabase/ui/components/close-button";
import { Dialog } from "@akabase/ui/components/dialog";
import { toaster } from "@akabase/ui/components/toast";
import { useRemoveOrganizationMemberMutationOption } from "../actions/mutations/member";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { UserId } from "@akabase/domain/user/schema";

type RemoveMemberDialogProps = {
  eventId: EventId;
  orgId: OrgId;
  userId: UserId;
  userName: string;
  children: ReactNode;
};

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
  const { mutateAsync, isPending } = useMutation(useRemoveOrganizationMemberMutationOption());

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
