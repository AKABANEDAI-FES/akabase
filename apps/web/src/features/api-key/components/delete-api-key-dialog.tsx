import type { ReactNode } from "react";
import { Result } from "@akabase/result";
import { useDialogContext } from "@ark-ui/react/dialog";
import { Button } from "@akabase/ui/components/button";
import { CloseButton } from "@akabase/ui/components/close-button";
import { Dialog } from "@akabase/ui/components/dialog";
import { toaster } from "@akabase/ui/components/toast";
import { Portal } from "@ark-ui/react/portal";
import type { ApiKeyListItem } from "@akabase/application/query/api-key/list-api-keys";
import { useMutation } from "@tanstack/react-query";
import { useDeleteApiKeyMutationOption } from "../actions/mutations";

type DeleteApiKeyDialogProps = {
  apiKey: ApiKeyListItem;
  children: ReactNode;
};

export function DeleteApiKeyDialog({ apiKey, children }: DeleteApiKeyDialogProps) {
  return (
    <Dialog.Root size="sm" role="alertdialog">
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <DeleteApiKeyDialogContent apiKey={apiKey} />
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function DeleteApiKeyDialogContent({ apiKey }: { apiKey: ApiKeyListItem }) {
  const dialog = useDialogContext();
  const { mutateAsync, isPending } = useMutation(useDeleteApiKeyMutationOption());

  const handleDelete = async () => {
    try {
      const result = await mutateAsync({ data: { apiKeyId: apiKey.id } });

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
        title: "APIキーを削除しました",
        description: `「${apiKey.name ?? "名前未設定"}」を削除しました`,
      });
      dialog.setOpen(false);
    } catch (error) {
      console.error("Failed to delete API key:", error);
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
        <Dialog.Title>APIキーを削除</Dialog.Title>
        <Dialog.Description>
          本当に「{apiKey.name ?? "名前未設定"}」（対象イベント:{" "}
          {apiKey.event === null ? "なし" : apiKey.event.name}
          ）を削除しますか？このキーを使用しているサイトはデータを取得できなくなります。この操作は取り消せません。
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
