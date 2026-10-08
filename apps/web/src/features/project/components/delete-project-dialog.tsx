import type { ReactNode } from "react";
import { Result } from "@akabase/result";
import { useDialogContext } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@akabase/ui/components/button";
import { CloseButton } from "@akabase/ui/components/close-button";
import { Dialog } from "@akabase/ui/components/dialog";
import { toaster } from "@akabase/ui/components/toast";
import type { ProjectListItem } from "@akabase/application/query/project/list-projects";
import { useDeleteProjectMutationOption } from "../actions/mutations";

type DeleteProjectDialogProps = {
  project: ProjectListItem;
  children: ReactNode;
};

export function DeleteProjectDialog({ project, children }: DeleteProjectDialogProps) {
  return (
    <Dialog.Root size="sm" role="alertdialog">
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <DeleteProjectDialogContent project={project} />
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function DeleteProjectDialogContent({ project }: { project: ProjectListItem }) {
  const dialog = useDialogContext();
  const { mutateAsync, isPending } = useMutation(useDeleteProjectMutationOption());

  const handleDelete = async () => {
    try {
      const result = await mutateAsync({
        data: { projectId: project.id, eventId: project.eventId },
      });

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
        title: "企画を削除しました",
        description: `「${project.name}」を削除しました`,
      });
      dialog.setOpen(false);
    } catch (error) {
      console.error("Failed to delete project:", error);
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
        <Dialog.Title>企画を削除</Dialog.Title>
        <Dialog.Description>
          本当に「{project.name}
          」を削除しますか？この企画の下書き・提出履歴・公開用データもすべて削除されます。この操作は取り消せません。
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
