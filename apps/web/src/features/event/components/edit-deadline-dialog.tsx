import { useState } from "react";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Result } from "@akabase/result";
import { Button } from "@akabase/ui/components/button";
import { CloseButton } from "@akabase/ui/components/close-button";
import { Dialog } from "@akabase/ui/components/dialog";
import { Field } from "@akabase/ui/components/field";
import { Input } from "@akabase/ui/components/input";
import { toaster } from "@akabase/ui/components/toast";
import { Portal } from "@ark-ui/react/portal";
import { Stack } from "@akabase/styled-system/jsx";
import { DEADLINE_FIELD_LABELS, deadlineRefinement } from "@akabase/domain/event/schema";
import type { EventId } from "@akabase/domain/event/schema";
import type { DeadlineListItem } from "@akabase/application/query/event/list-deadlines";
import { useMutation } from "@tanstack/react-query";
import {
  updateDeadlineInputSchema,
  useUpdateDeadlineMutationOption,
} from "../actions/mutations/deadline";
import { toDatetimeLocalValue } from "@/libs/date";
import { nl2br } from "@/libs/text";

type EditDeadlineDialogProps = {
  eventId: EventId;
  deadline: DeadlineListItem;
  defaultOpen?: boolean;
  onClose?: () => void;
};

export function EditDeadlineDialog({
  eventId,
  deadline,
  defaultOpen,
  onClose,
}: EditDeadlineDialogProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const { mutateAsync } = useMutation(useUpdateDeadlineMutationOption());

  const form = useForm({
    defaultValues: {
      startAt: deadline.startAt ?? null,
      deadlineAt: deadline.deadlineAt,
    },
    validators: {
      onDynamic: updateDeadlineInputSchema
        .pick({ startAt: true, deadlineAt: true })
        .check(deadlineRefinement),
      onSubmitAsync: async ({ value }) => {
        try {
          const data = updateDeadlineInputSchema.parse({
            ...value,
            eventId,
            deadlineId: deadline.id,
          });
          const result = await mutateAsync({ data });

          if (Result.isFailure(result)) {
            toaster.create({
              type: "error",
              title: "エラー",
              description: result.error.message,
            });
            return {};
          }

          return undefined;
        } catch (error) {
          console.error("Failed to update deadline:", error);
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
    onSubmit: async () => {
      const fieldLabel = DEADLINE_FIELD_LABELS[deadline.fieldKey] || deadline.fieldKey;
      toaster.create({
        type: "success",
        title: "締切を更新しました",
        description: `「${fieldLabel}」の締切を更新しました`,
      });
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
              onSubmit={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await form.handleSubmit();
              }}
            >
              <Dialog.Header>
                <Dialog.Title>締切を編集</Dialog.Title>
                <Dialog.Description>締切情報を編集します</Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4" w="full">
                  <Field.Root>
                    <Field.Label>フィールド</Field.Label>
                    <Input
                      value={DEADLINE_FIELD_LABELS[deadline.fieldKey] || deadline.fieldKey}
                      disabled
                    />
                    <Field.HelperText>フィールドは作成後に変更できません</Field.HelperText>
                  </Field.Root>

                  <form.Field name="startAt">
                    {(field) => (
                      <Field.Root invalid={!field.state.meta.isValid}>
                        <Field.Label htmlFor={field.name}>開始日時</Field.Label>
                        <Input
                          type="datetime-local"
                          id={field.name}
                          name={field.name}
                          value={field.state.value ? toDatetimeLocalValue(field.state.value) : ""}
                          onBlur={field.handleBlur}
                          onChange={(e) => {
                            const { value } = e.target;
                            field.handleChange(value ? new Date(value) : null);
                          }}
                        />
                        <Field.HelperText>
                          開始日時を削除する場合は空欄にしてください
                        </Field.HelperText>
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

                  <form.Field name="deadlineAt">
                    {(field) => (
                      <Field.Root invalid={!field.state.meta.isValid}>
                        <Field.Label htmlFor={field.name}>
                          終了日時 <Field.RequiredIndicator />
                        </Field.Label>
                        <Input
                          type="datetime-local"
                          id={field.name}
                          name={field.name}
                          value={toDatetimeLocalValue(field.state.value)}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(new Date(e.target.value))}
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
                        更新
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
