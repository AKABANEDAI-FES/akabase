import { useMemo, useState } from "react";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Result } from "@praha/byethrow";
import { createListCollection } from "@ark-ui/react/collection";
import { Button, CloseButton, Dialog, Field, Input, Select, toaster } from "@/components/ui";
import { Portal } from "@ark-ui/react/portal";
import { Stack } from "@archive/styled-system/jsx";
import type { EventId, PlaceId } from "@/domain/shared/ids";
import type { PlaceListItem } from "@/application/query/event/list-places";
import { createPlaceInputSchema, useCreatePlaceMutation } from "@/features/event/actions/mutations";
import { nl2br } from "@/libs/text";

interface CreatePlaceDialogProps {
  eventId: EventId;
  places: PlaceListItem[];
  defaultOpen?: boolean;
  onClose?: () => void;
}

/**
 * Create place dialog with defaultOpen/onClose pattern for new page route
 */
export function CreatePlaceDialog({
  eventId,
  places,
  defaultOpen,
  onClose,
}: CreatePlaceDialogProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const { mutateAsync } = useCreatePlaceMutation();

  // Build parent select options
  const parentCollection = useMemo(() => {
    const items = places.map((p) => ({ label: p.name, value: p.id }));
    return createListCollection({ items });
  }, [places]);

  const form = useForm({
    defaultValues: {
      name: "",
      parentId: null as string | null,
    },
    validators: {
      onDynamic: createPlaceInputSchema.omit({ eventId: true }),
      onSubmitAsync: async ({ value }) => {
        try {
          const result = await mutateAsync({
            data: { name: value.name, parentId: value.parentId, eventId },
          });

          if (Result.isFailure(result)) {
            // Display field-level error for duplicate place names
            if (result.error.code === "PLACE_NOT_UNIQUE") {
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
          console.error("Failed to create place:", error);
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
        title: "場所を作成しました",
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
                <Dialog.Title>場所を追加</Dialog.Title>
                <Dialog.Description>新しい場所を作成します</Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4" w="full">
                  <form.Field name="name">
                    {(field) => (
                      <Field.Root invalid={!field.state.meta.isValid}>
                        <Field.Label htmlFor={field.name}>
                          場所名 <Field.RequiredIndicator />
                        </Field.Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="例: 第一体育館"
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

                  <form.Field name="parentId">
                    {(field) => (
                      <Field.Root>
                        <Field.Label htmlFor={field.name}>親の場所</Field.Label>
                        <Select.Root
                          collection={parentCollection}
                          value={field.state.value ? [field.state.value] : []}
                          onValueChange={({ value }) =>
                            field.handleChange((value[0] as PlaceId | undefined) ?? null)
                          }
                          disabled={parentCollection.items.length === 0}
                        >
                          <Select.Control>
                            <Select.Trigger>
                              <Select.ValueText placeholder="親の場所を選択" />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.ClearTrigger />
                          </Select.Control>
                          <Select.Positioner>
                            <Select.Content>
                              {parentCollection.items.map((option) => (
                                <Select.Item key={option.value} item={option}>
                                  <Select.ItemText>{option.label}</Select.ItemText>
                                  <Select.ItemIndicator />
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Positioner>
                        </Select.Root>
                        <Field.HelperText>
                          階層構造を作る場合は親の場所を選択してください
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
