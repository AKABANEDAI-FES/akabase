import type { ReactNode } from "react";
import { Result } from "@praha/byethrow";
import { useDialogContext } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";
import { useNavigate } from "@tanstack/react-router";
import { Button, CloseButton, Dialog, toaster } from "@/components/ui";
import type { EventId, OrgId } from "@/domain/shared/ids";
import { useDeleteOrganizationMutation } from "@/features/organization/actions/mutations";

interface DeleteOrganizationDialogProps {
  eventId: EventId;
  orgId: OrgId;
  orgName: string;
  slug: string;
  children: ReactNode;
}

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
  const { mutateAsync, isPending } = useDeleteOrganizationMutation();

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
      navigate({ to: "/$slug/committee/organizations", params: { slug } });
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
