import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Result } from "@praha/byethrow";
import {
  createOrganizationInputSchema,
  useCreateOrganizationMutation,
} from "@/features/organization/actions";
import { Button, CloseButton, Dialog, Field, Input, Textarea, toaster } from "@/components/ui";
import { Portal } from "@ark-ui/react/portal";
import { Stack } from "styled-system/jsx";
import { useState } from "react";
import { nl2br } from "@/libs/text";
import type { EventId } from "@/domain/shared/ids";

interface CreateOrganizationDialogProps {
  eventId: EventId;
  defaultOpen?: boolean;
  onClose?: () => void;
}

/**
 * Create organization dialog component
 */
export function CreateOrganizationDialog({
  eventId,
  defaultOpen,
  onClose,
}: CreateOrganizationDialogProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const { mutateAsync } = useCreateOrganizationMutation();

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      logoImageId: null as string | null,
    },
    validators: {
      onDynamic: createOrganizationInputSchema.omit({ eventId: true }),
      onSubmitAsync: async ({ value }) => {
        try {
          const result = await mutateAsync({ data: { ...value, eventId } });

          if (Result.isFailure(result)) {
            // Display error as toast
            toaster.create({
              type: "error",
              title: "エラー",
              description: result.error.message,
            });
            return {};
          }

          // Success - return undefined to trigger onSubmit
          return undefined;
        } catch (error) {
          console.error("Failed to create organization:", error);
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
        title: "出展団体を作成しました",
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
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
            >
              <Dialog.Header>
                <Dialog.Title>出展団体を作成</Dialog.Title>
                <Dialog.Description>新しい出展団体の情報を入力してください</Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="6" w="full">
                  <form.Field name="name">
                    {(field) => (
                      <Field.Root invalid={!field.state.meta.isValid}>
                        <Field.Label htmlFor={field.name}>
                          出展団体名 <Field.RequiredIndicator />
                        </Field.Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="例: サークル名"
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
                      </Field.Root>
                    )}
                  </form.Field>

                  <form.Field name="description">
                    {(field) => (
                      <Field.Root invalid={!field.state.meta.isValid}>
                        <Field.Label htmlFor={field.name}>説明（任意）</Field.Label>
                        <Textarea
                          id={field.name}
                          name={field.name}
                          value={field.state.value ?? ""}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="出展団体の説明を100文字以内で入力"
                          rows={3}
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
                        <Field.HelperText>100文字以内で入力してください</Field.HelperText>
                      </Field.Root>
                    )}
                  </form.Field>

                  {/* TODO: ロゴアップロード機能は将来実装 */}
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
