import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createListCollection } from "@ark-ui/react/collection";
import { Result } from "@archive/result";
import { createProjectInputSchema, useCreateProjectMutationOption } from "../actions/mutations";
import { generateLoadPlacesQueryOptions } from "@/features/event/actions/queries/place";
import { Button } from "@archive/ui/components/button";
import { CloseButton } from "@archive/ui/components/close-button";
import { Dialog } from "@archive/ui/components/dialog";
import { Field } from "@archive/ui/components/field";
import { Input } from "@archive/ui/components/input";
import { Select } from "@archive/ui/components/select";
import { toaster } from "@archive/ui/components/toast";
import { Portal } from "@ark-ui/react/portal";
import { Stack } from "@archive/styled-system/jsx";
import { useState } from "react";
import { nl2br } from "@/libs/text";
import type { EventId } from "@archive/domain/event/schema";
import type { OrgId } from "@archive/domain/organization/schema";
import { LogoUploadField } from "./logo-upload-field";

type CreateProjectDialogProps = {
  eventId: EventId;
  orgId: OrgId;
  defaultOpen?: boolean;
  onClose?: () => void;
};

/**
 * Create project dialog component
 */
export function CreateProjectDialog({
  eventId,
  orgId,
  defaultOpen,
  onClose,
}: CreateProjectDialogProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const { mutateAsync } = useMutation(useCreateProjectMutationOption());

  // Load places for select dropdown
  const { data: places } = useSuspenseQuery(generateLoadPlacesQueryOptions(eventId));

  // Create collection for Select component
  const placesCollection = createListCollection({
    items: places.map((place) => ({
      label: place.name,
      value: place.id, // Store place ID as value
    })),
  });

  const form = useForm({
    defaultValues: {
      name: "",
      placeId: null as string | null,
      logoImageId: null as string | null,
    },
    validators: {
      onDynamic: createProjectInputSchema.omit({ eventId: true, orgId: true }),
      onSubmitAsync: async ({ value }) => {
        try {
          const result = await mutateAsync({ data: { ...value, eventId, orgId } });

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
          console.error("Failed to create project:", error);
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
        title: "企画を作成しました",
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
                <Dialog.Title>企画を作成</Dialog.Title>
                <Dialog.Description>新しい企画の情報を入力してください</Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="6" w="full">
                  {/* Project name field */}
                  <form.Field name="name">
                    {(field) => (
                      <Field.Root invalid={!field.state.meta.isValid}>
                        <Field.Label htmlFor={field.name}>
                          企画名 <Field.RequiredIndicator />
                        </Field.Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="例: 模擬店、展示、ステージ発表"
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

                  {/* Place selection field */}
                  <form.Field name="placeId">
                    {(field) => (
                      <Field.Root invalid={!field.state.meta.isValid}>
                        <Field.Label htmlFor={field.name}>開催場所（任意）</Field.Label>
                        <Select.Root
                          collection={placesCollection}
                          value={field.state.value ? [field.state.value] : []}
                          onValueChange={({ value }) => {
                            field.handleChange(value[0] || null);
                          }}
                          positioning={{ sameWidth: true }}
                        >
                          <Select.Control>
                            <Select.Trigger>
                              <Select.ValueText placeholder="場所を選択" />
                              <Select.Indicator />
                            </Select.Trigger>
                          </Select.Control>
                          <Select.Positioner>
                            <Select.Content>
                              {placesCollection.items.map((option) => (
                                <Select.Item key={option.value} item={option}>
                                  <Select.ItemText>{option.label}</Select.ItemText>
                                  <Select.ItemIndicator />
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Positioner>
                        </Select.Root>
                        {!field.state.meta.isValid && (
                          <Field.ErrorText>
                            {nl2br(
                              field.state.meta.errors
                                .map((error) => error?.message ?? "")
                                .join("\n"),
                            )}
                          </Field.ErrorText>
                        )}
                        <Field.HelperText>企画を実施する場所を選択してください</Field.HelperText>
                      </Field.Root>
                    )}
                  </form.Field>

                  {/* Logo upload field */}
                  <form.Field name="logoImageId">
                    {(field) => (
                      <LogoUploadField
                        onLogoChange={(logoImageId) => field.handleChange(logoImageId)}
                        scope={{ type: "pending" }}
                      />
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
