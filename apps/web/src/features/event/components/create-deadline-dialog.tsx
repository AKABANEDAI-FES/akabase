import { useMemo, useState } from "react";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Result } from "@akabase/result";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createListCollection } from "@ark-ui/react/collection";
import { Button } from "@akabase/ui/components/button";
import { CloseButton } from "@akabase/ui/components/close-button";
import { Dialog } from "@akabase/ui/components/dialog";
import { Field } from "@akabase/ui/components/field";
import { Input } from "@akabase/ui/components/input";
import { Select } from "@akabase/ui/components/select";
import { toaster } from "@akabase/ui/components/toast";
import { Portal } from "@ark-ui/react/portal";
import { Stack } from "@akabase/styled-system/jsx";
import {
  DEADLINE_FIELD_KEYS,
  DEADLINE_FIELD_LABELS,
  deadlineRefinement,
} from "@akabase/domain/event/schema";
import type { DeadlineFieldKey, EventId } from "@akabase/domain/event/schema";
import {
  createDeadlineInputSchema,
  useCreateDeadlineMutationOption,
} from "../actions/mutations/deadline";
import { generateLoadDeadlinesQueryOptions } from "../actions/queries/deadline";
import { toDatetimeLocalValue } from "@/libs/date";
import { nl2br } from "@/libs/text";

type CreateDeadlineDialogProps = {
  eventId: EventId;
  defaultOpen?: boolean;
  onClose?: () => void;
};

export function CreateDeadlineDialog({ eventId, defaultOpen, onClose }: CreateDeadlineDialogProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const { mutateAsync } = useMutation(useCreateDeadlineMutationOption());
  const { data: existingDeadlines } = useSuspenseQuery(generateLoadDeadlinesQueryOptions(eventId));

  // Build field key select options (exclude already set fields)
  const fieldKeyCollection = useMemo(() => {
    const usedFieldKeys = new Set(existingDeadlines.map((d) => d.fieldKey));
    const items = DEADLINE_FIELD_KEYS.filter((key) => !usedFieldKeys.has(key)).map((key) => ({
      label: DEADLINE_FIELD_LABELS[key],
      value: key,
    }));
    return createListCollection({ items });
  }, [existingDeadlines]);

  const form = useForm({
    defaultValues: {
      fieldKey: "",
      startAt: null as Date | null,
      deadlineAt: new Date(),
    },
    validators: {
      onDynamic: createDeadlineInputSchema
        .pick({
          fieldKey: true,
          startAt: true,
          deadlineAt: true,
        })
        .check(deadlineRefinement),
      onSubmitAsync: async ({ value }) => {
        const data = createDeadlineInputSchema.parse({
          ...value,
          eventId,
        });
        try {
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
          console.error("Failed to create deadline:", error);
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
      const fieldLabel =
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        DEADLINE_FIELD_LABELS[value.fieldKey as DeadlineFieldKey] || value.fieldKey;
      toaster.create({
        type: "success",
        title: "締切を作成しました",
        description: `「${fieldLabel}」の締切を設定しました`,
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
              onSubmit={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await form.handleSubmit();
              }}
            >
              <Dialog.Header>
                <Dialog.Title>締切を追加</Dialog.Title>
                <Dialog.Description>フィールドの締切を設定します</Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4" w="full">
                  <form.Field name="fieldKey">
                    {(field) => (
                      <Field.Root invalid={!field.state.meta.isValid}>
                        <Field.Label htmlFor={field.name}>
                          フィールド <Field.RequiredIndicator />
                        </Field.Label>
                        <Select.Root
                          collection={fieldKeyCollection}
                          value={field.state.value ? [field.state.value] : []}
                          onValueChange={({ value }) =>
                            field.handleChange(value[0] ?? field.state.value)
                          }
                        >
                          <Select.Control>
                            <Select.Trigger>
                              <Select.ValueText placeholder="フィールドを選択" />
                              <Select.Indicator />
                            </Select.Trigger>
                          </Select.Control>
                          <Select.Positioner>
                            <Select.Content>
                              {fieldKeyCollection.items.map((option) => (
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
                          開始日時を指定しない場合、締切日時まで常に編集可能です
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
