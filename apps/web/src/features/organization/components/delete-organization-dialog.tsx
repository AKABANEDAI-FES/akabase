import type { ReactNode } from "react";
import { Result } from "@akabase/result";
import { useDialogContext } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@akabase/ui/components/button";
import { CloseButton } from "@akabase/ui/components/close-button";
import { Dialog } from "@akabase/ui/components/dialog";
import { toaster } from "@akabase/ui/components/toast";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import { useDeleteOrganizationMutationOption } from "../actions/mutations";

type DeleteOrganizationDialogProps = {
  eventId: EventId;
  orgId: OrgId;
  orgName: string;
  slug: string;
  children: ReactNode;
};

export function DeleteOrganizationDialog({
  eventId,
  orgId,
  orgName,
  slug,
  children,
}: DeleteOrganizationDialogProps) {
  return (
    <Dialog.Root size="sm" role="alertdialog">
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <DeleteOrganizationDialogContent
            eventId={eventId}
            orgId={orgId}
            orgName={orgName}
            slug={slug}
          />
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function DeleteOrganizationDialogContent({
  eventId,
  orgId,
  orgName,
  slug,
}: {
  eventId: EventId;
  orgId: OrgId;
  orgName: string;
  slug: string;
}) {
  const dialog = useDialogContext();
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useMutation(useDeleteOrganizationMutationOption());

  const handleDelete = async () => {
    try {
      const result = await mutateAsync({ data: { eventId, orgId } });

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
        title: "出展団体を削除しました",
        description: `「${orgName}」を削除しました`,
      });
      dialog.setOpen(false);
      await navigate({ to: "/$slug/committee/organizations", params: { slug } });
    } catch (error) {
      console.error("Failed to delete organization:", error);
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
        <Dialog.Title>出展団体を削除</Dialog.Title>
        <Dialog.Description>
          本当に「{orgName}
          」を削除しますか？この出展団体に所属するすべての企画・メンバーも削除されます。この操作は取り消せません。
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
