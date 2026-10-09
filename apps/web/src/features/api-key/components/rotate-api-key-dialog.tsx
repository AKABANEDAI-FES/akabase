import { useState } from "react";
import { Result } from "@akabase/result";
import { Button } from "@akabase/ui/components/button";
import { CloseButton } from "@akabase/ui/components/close-button";
import { Dialog } from "@akabase/ui/components/dialog";
import { toaster } from "@akabase/ui/components/toast";
import { Portal } from "@ark-ui/react/portal";
import type { ApiKeyListItem } from "@akabase/application/query/api-key/list-api-keys";
import { useMutation } from "@tanstack/react-query";
import { useRotateApiKeyMutationOption } from "../actions/mutations";
import { IssuedApiKey } from "./issued-api-key";

type RotateApiKeyDialogProps = {
  apiKey: ApiKeyListItem;
  onClose: () => void;
};

export function RotateApiKeyDialog({ apiKey, onClose }: RotateApiKeyDialogProps) {
  const [open, setOpen] = useState(true);
  const [rotatedKey, setRotatedKey] = useState<string | null>(null);
  const { mutateAsync, isPending } = useMutation(useRotateApiKeyMutationOption());

  const handleRotate = async () => {
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

      setRotatedKey(result.value.key);
    } catch (error) {
      console.error("Failed to rotate API key:", error);
      toaster.create({
        type: "error",
        title: "エラー",
        description: "予期しないエラーが発生しました",
      });
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={({ open }) => setOpen(open)}
      onExitComplete={onClose}
      closeOnEscape={rotatedKey === null && !isPending}
      size="md"
      role="alertdialog"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            {rotatedKey === null ? (
              <>
                <Dialog.Header>
                  <Dialog.Title>APIキーを再発行</Dialog.Title>
                  <Dialog.Description>
                    「{apiKey.name ?? "名前未設定"}」（対象イベント:{" "}
                    {apiKey.event === null ? "なし" : apiKey.event.name}
                    ）を再発行しますか？現在のキーはすぐに無効になり、このキーを使用しているサイトは新しいキーを設定するまでデータを取得できなくなります。
                  </Dialog.Description>
                </Dialog.Header>
                <Dialog.Footer>
                  <Dialog.ActionTrigger asChild>
                    <Button type="button" variant="outline" disabled={isPending}>
                      キャンセル
                    </Button>
                  </Dialog.ActionTrigger>
                  <Button
                    type="button"
                    colorPalette="red"
                    loading={isPending}
                    onClick={handleRotate}
                  >
                    再発行
                  </Button>
                </Dialog.Footer>
                <Dialog.CloseTrigger asChild>
                  <CloseButton disabled={isPending} />
                </Dialog.CloseTrigger>
              </>
            ) : (
              <>
                <Dialog.Header>
                  <Dialog.Title>APIキーを再発行しました</Dialog.Title>
                  <Dialog.Description>
                    新しいAPIキーをコピーして、利用するサイトに設定してください。
                  </Dialog.Description>
                </Dialog.Header>
                <Dialog.Body>
                  <IssuedApiKey apiKey={rotatedKey} />
                </Dialog.Body>
                <Dialog.Footer>
                  <Dialog.ActionTrigger asChild>
                    <Button type="button">閉じる</Button>
                  </Dialog.ActionTrigger>
                </Dialog.Footer>
              </>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
