import type { ReactNode } from "react";
import { Result } from "@akabase/result";
import { useDialogContext } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@akabase/ui/components/button";
import { CloseButton } from "@akabase/ui/components/close-button";
import { Dialog } from "@akabase/ui/components/dialog";
import { toaster } from "@akabase/ui/components/toast";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { ProjectId } from "@akabase/domain/project/schema";
import { useDeleteProjectMutationOption } from "../actions/mutations";
import {
  generateLoadDraftCacheKey,
  generateLoadProjectDetailCacheKey,
  generateLoadProjectPublishedCacheKey,
  generateLoadSubmissionsCacheKey,
} from "../actions/queries";

type DeleteProjectDialogContentProps = {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
  projectName: string;
  slug: string;
};

type DeleteProjectDialogProps = DeleteProjectDialogContentProps & {
  children: ReactNode;
};

export function DeleteProjectDialog({ children, ...props }: DeleteProjectDialogProps) {
  return (
    <Dialog.Root size="sm" role="alertdialog">
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <DeleteProjectDialogContent {...props} />
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function DeleteProjectDialogContent({
  eventId,
  orgId,
  projectId,
  projectName,
  slug,
}: DeleteProjectDialogContentProps) {
  const dialog = useDialogContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation(useDeleteProjectMutationOption());

  const handleDelete = async () => {
    try {
      const result = await mutateAsync({ data: { eventId, projectId } });

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
        description: `「${projectName}」を削除しました`,
      });
      dialog.setOpen(false);
      await navigate({
        to: "/$slug/committee/organizations/$orgId/projects",
        params: { slug, orgId },
      });
      // Remove after navigating so the page being left does not suspend on missing data
      for (const queryKey of [
        generateLoadProjectDetailCacheKey(eventId, orgId, projectId),
        generateLoadProjectPublishedCacheKey(eventId, orgId, projectId),
        generateLoadDraftCacheKey(eventId, orgId, projectId),
        generateLoadSubmissionsCacheKey(eventId, orgId, projectId),
      ]) {
        queryClient.removeQueries({ queryKey });
      }
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
          本当に「{projectName}
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
