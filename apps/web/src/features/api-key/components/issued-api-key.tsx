import { useState } from "react";
import { Alert } from "@akabase/ui/components/alert";
import { Field } from "@akabase/ui/components/field";
import { IconButton } from "@akabase/ui/components/icon-button";
import { Input } from "@akabase/ui/components/input";
import { Flex, Stack } from "@akabase/styled-system/jsx";
import { CheckIcon, CopyIcon } from "lucide-react";

type IssuedApiKeyProps = {
  apiKey: string;
};

export function IssuedApiKey({ apiKey }: IssuedApiKeyProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopyState("copied");
    } catch (error) {
      console.error("Failed to copy API key:", error);
      setCopyState("failed");
    }
  };

  return (
    <Stack gap="4" w="full">
      <Alert.Root status="warning" role="alert">
        <Alert.Content>
          <Alert.Title>このキーを表示できるのは今だけです</Alert.Title>
          <Alert.Description>
            ダイアログを閉じると二度と確認できません。失った場合は作り直して、古いキーを削除してください。
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>
      <Field.Root>
        <Field.Label htmlFor="issued-api-key">APIキー</Field.Label>
        <Flex gap="2" align="center" w="full">
          <Input
            id="issued-api-key"
            value={apiKey}
            readOnly
            autoFocus
            spellCheck={false}
            autoComplete="off"
            onFocus={(e) => e.target.select()}
          />
          <IconButton aria-label="コピー" variant="outline" onClick={handleCopy}>
            {copyState === "copied" ? <CheckIcon /> : <CopyIcon />}
          </IconButton>
        </Flex>
        <Field.HelperText aria-live="polite">
          {copyState === "copied"
            ? "クリップボードにコピーしました。"
            : copyState === "failed"
              ? "コピーできませんでした。入力欄のキーを選択して手動でコピーしてください。"
              : "コピーしてから閉じてください。"}
        </Field.HelperText>
      </Field.Root>
    </Stack>
  );
}
