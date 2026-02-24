import { useState } from "react";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Result } from "@praha/byethrow";
import { Button, CloseButton, Dialog, Field, Input, toaster } from "@/components/ui";
import { Portal } from "@ark-ui/react/portal";
import { Stack } from "styled-system/jsx";
import type { EventId } from "@/domain/shared/ids";
import { createTagInputSchema, useCreateTagMutation } from "@/features/event/actions/mutations";
import { nl2br } from "@/libs/text";

interface CreateTagDialogProps {
  eventId: EventId;
  defaultOpen?: boolean;
  onClose?: () => void;
}

export function CreateTagDialog({ eventId, defaultOpen, onClose }: CreateTagDialogProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const { mutateAsync } = useCreateTagMutation();

  const form = useForm({
    defaultValues: {
      name: "",
    },
    validators: {
      onDynamic: createTagInputSchema.omit({ eventId: true }),
      onSubmitAsync: async ({ value }) => {
        try {
          const result = await mutateAsync({ data: { ...value, eventId } });

          if (Result.isFailure(result)) {
            // Display field-level error for duplicate tag names
            if (result.error.code === "TAG_NOT_UNIQUE") {
              return {
                fields: {
                  name: {
                    message: result.error.message,
                  },
                },
              };
            }

            // Display toast for other errors
            toaster.create({
              type: "error",
              title: "エラー",
              description: result.error.message,
            });
            return {};
          }

          return undefined;
        } catch (error) {
          console.error("Failed to create tag:", error);
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
        title: "タグを作成しました",
        description: `「${value.name}」を作成しました`,
      });
      form.reset();
      setOpen(false);
    },
  });

  return (
    <Dialog.Root
      open={open}
      onOpenChange={({ open }) => setOpen(open)}
      onExitComplete={onClose}
      size="md"
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
                <Dialog.Title>タグを追加</Dialog.Title>
                <Dialog.Description>新しいタグを作成します</Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4" w="full">
                  <form.Field name="name">
                    {(field) => (
                      <Field.Root invalid={!field.state.meta.isValid}>
                        <Field.Label htmlFor={field.name}>
                          タグ名 <Field.RequiredIndicator />
                        </Field.Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="例: 屋外企画"
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
