import { useMemo, useState } from "react";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Result } from "@akabase/result";
import { Alert } from "@akabase/ui/components/alert";
import { Button } from "@akabase/ui/components/button";
import { CloseButton } from "@akabase/ui/components/close-button";
import { Dialog } from "@akabase/ui/components/dialog";
import { Field } from "@akabase/ui/components/field";
import { IconButton } from "@akabase/ui/components/icon-button";
import { Input } from "@akabase/ui/components/input";
import { Select } from "@akabase/ui/components/select";
import { toaster } from "@akabase/ui/components/toast";
import { Portal } from "@ark-ui/react/portal";
import { createListCollection } from "@ark-ui/react/collection";
import { Flex, Stack } from "@akabase/styled-system/jsx";
import { css } from "@akabase/styled-system/css";
import { CheckIcon, CopyIcon } from "lucide-react";
import { cast } from "@akabase/domain/shared/ids";
import type { EventId } from "@akabase/domain/event/schema";
import type { EventListItem } from "@akabase/application/query/event/list-events";
import { useMutation } from "@tanstack/react-query";
import { createApiKeyInputSchema, useCreateApiKeyMutationOption } from "../actions/mutations";
import { nl2br } from "@/libs/text";

const createApiKeyFormSchema = createApiKeyInputSchema.extend({
  eventId: z.string().min(1, "対象イベントを選択してください"),
});

type CreateApiKeyDialogProps = {
  events: EventListItem[];
  defaultOpen?: boolean;
  onClose?: () => void;
};

export function CreateApiKeyDialog({ events, defaultOpen, onClose }: CreateApiKeyDialogProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const { mutateAsync } = useMutation(useCreateApiKeyMutationOption());

  const eventCollection = useMemo(
    () =>
      createListCollection({
        items: events.map((event) => ({ label: event.name, value: event.id })),
      }),
    [events],
  );

  const form = useForm({
    defaultValues: {
      name: "",
      eventId: "",
    },
    validators: {
      onDynamic: createApiKeyFormSchema,
      onSubmitAsync: async ({ value }) => {
        try {
          const result = await mutateAsync({
            data: { name: value.name, eventId: cast<EventId>(value.eventId) },
          });

          if (Result.isFailure(result)) {
            toaster.create({
              type: "error",
              title: "エラー",
              description: result.error.message,
            });
            return {};
          }

          setCreatedKey(result.value.key);
          return undefined;
        } catch (error) {
          console.error("Failed to create API key:", error);
          toaster.create({
            type: "error",
            title: "エラー",
            description: "予期しないエラーが発生しました",
          });
          return {};
        }
      },
    },
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
  });

  const handleCopy = async () => {
    if (createdKey === null) {
      return;
    }
    try {
      await navigator.clipboard.writeText(createdKey);
      setCopyState("copied");
    } catch (error) {
      console.error("Failed to copy API key:", error);
      setCopyState("failed");
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={({ open }) => setOpen(open)}
      onExitComplete={onClose}
      closeOnInteractOutside={createdKey === null}
      closeOnEscape={createdKey === null}
      size="md"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            {createdKey === null ? (
              <form
                className={css({ display: "contents" })}
                onSubmit={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  await form.handleSubmit();
                }}
              >
                <Dialog.Header>
                  <Dialog.Title>APIキーを作成</Dialog.Title>
                  <Dialog.Description>
                    選択したイベントの公開データを取得できるAPIキーを発行します
                  </Dialog.Description>
                </Dialog.Header>
                <Dialog.Body>
                  <Stack gap="4" w="full">
                    <form.Field name="name">
                      {(field) => (
                        <Field.Root invalid={!field.state.meta.isValid}>
                          <Field.Label htmlFor={field.name}>
                            APIキー名 <Field.RequiredIndicator />
                          </Field.Label>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="例: 学祭サイト用"
                          />
                          {!field.state.meta.isValid && field.state.meta.errors.length > 0 && (
                            <Field.ErrorText>
                              {nl2br(
                                field.state.meta.errors
                                  .map((error) => error?.message)
                                  .filter((msg) => msg != null)
                                  .join("\n"),
                              )}
                            </Field.ErrorText>
                          )}
                        </Field.Root>
                      )}
                    </form.Field>
                    <form.Field name="eventId">
                      {(field) => (
                        <Field.Root invalid={!field.state.meta.isValid}>
                          <Field.Label htmlFor={field.name}>
                            対象イベント <Field.RequiredIndicator />
                          </Field.Label>
                          <Select.Root
                            collection={eventCollection}
                            value={field.state.value === "" ? [] : [field.state.value]}
                            onValueChange={({ value }) => field.handleChange(value[0] ?? "")}
                            positioning={{ sameWidth: true }}
                          >
                            <Select.Control>
                              <Select.Trigger>
                                <Select.ValueText placeholder="対象イベントを選択" />
                                <Select.Indicator />
                              </Select.Trigger>
                            </Select.Control>
                            <Select.Positioner>
                              <Select.Content>
                                {eventCollection.items.map((option) => (
                                  <Select.Item key={option.value} item={option}>
                                    <Select.ItemText>{option.label}</Select.ItemText>
                                    <Select.ItemIndicator />
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select.Positioner>
                          </Select.Root>
                          {!field.state.meta.isValid && field.state.meta.errors.length > 0 && (
                            <Field.ErrorText>
                              {nl2br(
                                field.state.meta.errors
                                  .map((error) => error?.message)
                                  .filter((msg) => msg != null)
                                  .join("\n"),
                              )}
                            </Field.ErrorText>
                          )}
                        </Field.Root>
                      )}
                    </form.Field>
                  </Stack>
                </Dialog.Body>
                <Dialog.Footer>
                  <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                    {([canSubmit, isSubmitting]) => (
                      <>
                        <Dialog.ActionTrigger asChild>
                          <Button type="button" variant="outline" disabled={isSubmitting}>
                            キャンセル
                          </Button>
                        </Dialog.ActionTrigger>
                        <Button type="submit" loading={isSubmitting} disabled={!canSubmit}>
                          作成
                        </Button>
                      </>
                    )}
                  </form.Subscribe>
                </Dialog.Footer>
                <Dialog.CloseTrigger asChild>
                  <CloseButton />
                </Dialog.CloseTrigger>
              </form>
            ) : (
              <>
                <Dialog.Header>
                  <Dialog.Title>APIキーを作成しました</Dialog.Title>
                  <Dialog.Description>
                    発行したAPIキーをコピーして、利用するサイトに設定してください。
                  </Dialog.Description>
                </Dialog.Header>
                <Dialog.Body>
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
                      <Field.Label htmlFor="created-api-key">APIキー</Field.Label>
                      <Flex gap="2" align="center" w="full">
                        <Input
                          id="created-api-key"
                          value={createdKey}
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
