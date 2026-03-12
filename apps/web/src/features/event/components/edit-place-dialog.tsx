import { useState } from "react";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Result } from "@archive/result";
import { Button } from "@archive/ui/components/button";
import { CloseButton } from "@archive/ui/components/close-button";
import { Dialog } from "@archive/ui/components/dialog";
import { Field } from "@archive/ui/components/field";
import { Input } from "@archive/ui/components/input";
import { toaster } from "@archive/ui/components/toast";
import { Portal } from "@ark-ui/react/portal";
import { Stack } from "@archive/styled-system/jsx";
import type { EventId } from "@archive/domain/event/schema";
import type { PlaceListItem } from "@archive/application/query/event/list-places";
import { useMutation } from "@tanstack/react-query";
import { updatePlaceInputSchema, useUpdatePlaceMutationOption } from "../actions/mutations/place";
import { nl2br } from "@/libs/text";

type EditPlaceDialogProps = {
  eventId: EventId;
  place: PlaceListItem;
  defaultOpen?: boolean;
  onClose?: () => void;
};

export function EditPlaceDialog({ eventId, place, defaultOpen, onClose }: EditPlaceDialogProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const { mutateAsync } = useMutation(useUpdatePlaceMutationOption());

  const form = useForm({
    defaultValues: {
      name: place.name,
    },
    validators: {
      onDynamic: updatePlaceInputSchema.omit({ eventId: true, placeId: true }),
      onSubmitAsync: async ({ value }) => {
        try {
          const result = await mutateAsync({
            data: { placeId: place.id, name: value.name, eventId },
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
          console.error("Failed to update place:", error);
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
        title: "場所を更新しました",
        description: `「${value.name}」を更新しました`,
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
                <Dialog.Title>場所を編集</Dialog.Title>
                <Dialog.Description>場所の名前を編集します</Dialog.Description>
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
