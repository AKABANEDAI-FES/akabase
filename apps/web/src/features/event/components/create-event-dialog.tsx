import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Result } from "@akabase/result";
import { useMutation } from "@tanstack/react-query";
import { createEventInputSchema, useCreateEventMutationOption } from "../actions/mutations";
import { Button } from "@akabase/ui/components/button";
import { CloseButton } from "@akabase/ui/components/close-button";
import { Dialog } from "@akabase/ui/components/dialog";
import { Field } from "@akabase/ui/components/field";
import { Input } from "@akabase/ui/components/input";
import { toaster } from "@akabase/ui/components/toast";
import { Portal } from "@ark-ui/react/portal";
import { Stack } from "@akabase/styled-system/jsx";
import { useState } from "react";
import { nl2br } from "@/libs/text";
import { EVENT_ERROR_CODE } from "@akabase/domain/event/errors";

type CreateEventDialogProps = {
  defaultOpen?: boolean;
  onClose?: () => void;
};

/**
 * Create event dialog component
 */
export function CreateEventDialog({ defaultOpen, onClose }: CreateEventDialogProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const { mutateAsync } = useMutation(useCreateEventMutationOption());

  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
    },
    validators: {
      onDynamic: createEventInputSchema,
      onSubmitAsync: async ({ value }) => {
        try {
          const result = await mutateAsync({ data: value });

          if (Result.isFailure(result)) {
            // Slug重複エラーの場合、フィールドエラーとして返す
            if (result.error.code === EVENT_ERROR_CODE.SLUG_NOT_UNIQUE) {
              return {
                fields: {
                  slug: {
                    message: result.error.message,
                  },
                },
              };
            }

            // その他のエラーはtoastで表示
            toaster.create({
              type: "error",
              title: "エラー",
              description: result.error.message,
            });
            return {};
          }

          // 成功時は何も返さない（onSubmitが実行される）
          return undefined;
        } catch (error) {
          console.error("Failed to create event:", error);
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
    onSubmit: async ({ value }) => {
      toaster.create({
        type: "success",
        title: "イベントを作成しました",
        description: `「${value.name}」を作成しました`,
      });

      setOpen(false);
    },
  });

  return (
    <Dialog.Root
      open={open}
      onOpenChange={({ open }) => setOpen(open)}
      onExitComplete={onClose}
      size="lg"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content asChild>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await form.handleSubmit();
              }}
            >
              <Dialog.Header>
                <Dialog.Title>イベントを作成</Dialog.Title>
                <Dialog.Description>新しいイベントの情報を入力してください</Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="6" w="full">
                  <form.Field name="name">
                    {(field) => (
                      <Field.Root invalid={!field.state.meta.isValid}>
                        <Field.Label htmlFor={field.name}>
                          イベント名 <Field.RequiredIndicator />
                        </Field.Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="例: 2025年度白山祭"
                        />
                        {!field.state.meta.isValid && (
                          <Field.ErrorText>
                            {nl2br(
                              field.state.meta.errors
                                .map((error) => error?.message ?? "")
                                .join("\n"),
                            )}
                          </Field.ErrorText>
                        )}
                        <Field.HelperText>イベントの正式名称を入力してください</Field.HelperText>
                      </Field.Root>
                    )}
                  </form.Field>

                  <form.Field name="slug">
                    {(field) => (
                      <Field.Root invalid={!field.state.meta.isValid}>
                        <Field.Label htmlFor={field.name}>
                          スラッグ (URL識別子) <Field.RequiredIndicator />
                        </Field.Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="例: 2025"
                        />
                        {!field.state.meta.isValid && (
                          <Field.ErrorText>
                            {nl2br(
                              field.state.meta.errors
                                .map((error) => error?.message ?? "")
                                .join("\n"),
                            )}
                          </Field.ErrorText>
                        )}
                        <Field.HelperText>
                          URLに使用される一意の識別子です（小文字英数字とハイフンのみ）
                        </Field.HelperText>
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
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
