import type { ReactNode } from "react";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Result } from "@praha/byethrow";
import { useDialogContext } from "@ark-ui/react/dialog";
import { Button, CloseButton, Dialog, Field, Input, toaster } from "@/components/ui";
import { Portal } from "@ark-ui/react/portal";
import { Stack } from "styled-system/jsx";
import type { EventId } from "@/domain/shared/ids";
import type { DeadlineListItem } from "@/application/query/event/list-deadlines";
import { DEADLINE_FIELD_LABELS, deadlineRefinement } from "@/domain/event/schema";
import type { DeadlineFieldKey } from "@/domain/event/schema";
import {
  updateDeadlineInputSchema,
  useUpdateDeadlineMutation,
} from "@/features/event/actions/mutations";
import { toDatetimeLocalValue } from "@/libs/date";
import { nl2br } from "@/libs/text";

interface EditDeadlineDialogProps {
  eventId: EventId;
  deadline: DeadlineListItem;
  children: ReactNode;
}

export function EditDeadlineDialog({ eventId, deadline, children }: EditDeadlineDialogProps) {
  return (
    <Dialog.Root size="md">
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <EditDeadlineDialogContent eventId={eventId} deadline={deadline} />
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function EditDeadlineDialogContent({
  eventId,
  deadline,
}: {
  eventId: EventId;
  deadline: DeadlineListItem;
}) {
  const dialog = useDialogContext();
  const { mutateAsync } = useUpdateDeadlineMutation();

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
      const fieldLabel =
        DEADLINE_FIELD_LABELS[deadline.fieldKey as DeadlineFieldKey] || deadline.fieldKey;
      toaster.create({
        type: "success",
        title: "締切を更新しました",
        description: `「${fieldLabel}」の締切を更新しました`,
      });
      dialog.setOpen(false);
    },
  });

  return (
    <Dialog.Content asChild>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
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
                value={
                  DEADLINE_FIELD_LABELS[deadline.fieldKey as DeadlineFieldKey] || deadline.fieldKey
                }
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
                      const value = e.target.value;
                      field.handleChange(value ? new Date(value) : null);
                    }}
                  />
                  <Field.HelperText>開始日時を削除する場合は空欄にしてください</Field.HelperText>
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
  );
}
