import { useRef, useState } from "react";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Result } from "@praha/byethrow";
import { Portal } from "@ark-ui/react/portal";
import { createListCollection } from "@ark-ui/react/collection";
import { Button, CloseButton, Dialog, Field, Select, toaster } from "@/components/ui";
import { Stack } from "styled-system/jsx";
import {
  addOrganizationMemberInputSchema,
  useAddOrganizationMemberMutation,
} from "@/features/organization/actions/mutations";
import { ORG_ROLES, ORG_ROLE_LABELS } from "@/domain/authorization/schema";
import type { OrgMemberRole } from "@/domain/organization/schema";
import { nl2br } from "@/libs/text";
import { ORGANIZATION_ERROR_CODE } from "@/domain/organization/errors";
import type { EventId, OrgId } from "@/domain/shared/ids";
import type { AddOrganizationMemberOutput } from "@/application/command/organization/add-organization-member";

export type EmailFieldProps = {
  value: string | null;
  onChange: (email: string | null) => void;
};

const roleCollection = createListCollection({
  items: ORG_ROLES.map((role) => ({
    label: ORG_ROLE_LABELS[role],
    value: role,
  })),
});

interface AddMemberDialogProps {
  orgId: OrgId;
  eventId: EventId;
  defaultOpen?: boolean;
  onClose?: () => void;
  renderEmailField: (props: EmailFieldProps) => React.ReactNode;
}

export function AddMemberDialog({
  orgId,
  eventId,
  defaultOpen,
  onClose,
  renderEmailField,
}: AddMemberDialogProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);

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
          <AddMemberDialogContent
            orgId={orgId}
            eventId={eventId}
            onSuccess={() => setOpen(false)}
            renderEmailField={renderEmailField}
          />
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function AddMemberDialogContent({
  orgId,
  eventId,
  onSuccess,
  renderEmailField: EmailField,
}: {
  orgId: OrgId;
  eventId: EventId;
  onSuccess: () => void;
  renderEmailField: (props: EmailFieldProps) => React.ReactNode;
}) {
  const { mutateAsync } = useAddOrganizationMemberMutation();
  const resultRef = useRef<AddOrganizationMemberOutput | null>(null);

  const form = useForm({
    defaultValues: {
      email: null as string | null,
      role: "manager" as OrgMemberRole,
    },
    validators: {
      onDynamic: addOrganizationMemberInputSchema.omit({ eventId: true, orgId: true }),
      onSubmitAsync: async ({ value }) => {
        const data = addOrganizationMemberInputSchema.parse({
          eventId,
          orgId,
          email: value.email,
          role: value.role,
        });
        try {
          resultRef.current = null;
          const result = await mutateAsync({ data });

          if (Result.isFailure(result)) {
            if (
              result.error.code === ORGANIZATION_ERROR_CODE.USER_ALREADY_MEMBER ||
              result.error.code === ORGANIZATION_ERROR_CODE.USER_NOT_FOUND
            ) {
              return {
                fields: {
                  email: { message: result.error.message },
                },
              };
            }

            toaster.create({
              type: "error",
              title: "エラー",
              description: result.error.message,
            });
            return {};
          }

          resultRef.current = result.value;
          return undefined;
        } catch (error) {
          console.error("Failed to add member:", error);
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
      if (resultRef.current) {
        const { user } = resultRef.current;
        toaster.create({
          type: "success",
          title: "メンバーを追加しました",
          description: `「${user.name}」を追加しました`,
        });
      }

      onSuccess();
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
          <Dialog.Title>メンバーを追加</Dialog.Title>
          <Dialog.Description>メールアドレスでユーザーを検索して追加します。</Dialog.Description>
        </Dialog.Header>
        <Dialog.Body>
          <Stack gap="4" w="full">
            <form.Field name="email">
              {(field) => (
                <Field.Root invalid={!field.state.meta.isValid}>
                  <EmailField
                    value={field.state.value ?? ""}
                    onChange={(email) => field.handleChange(email)}
                  />
                  {!field.state.meta.isValid && (
                    <Field.ErrorText>
                      {nl2br(
                        field.state.meta.errors.map((error) => error?.message ?? "").join("\n"),
                      )}
                    </Field.ErrorText>
                  )}
                </Field.Root>
              )}
            </form.Field>

            <form.Field name="role">
              {(field) => (
                <Field.Root invalid={!field.state.meta.isValid}>
                  <Field.Label>ロール</Field.Label>
                  <Select.Root
                    collection={roleCollection}
                    value={[field.state.value]}
                    onValueChange={({ value }) => {
                      if (value[0]) {
                        field.handleChange(value[0] as OrgMemberRole);
                      }
                    }}
                    positioning={{ sameWidth: true }}
                  >
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText />
                        <Select.Indicator />
                      </Select.Trigger>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        {roleCollection.items.map((option) => (
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
                        field.state.meta.errors.map((error) => error?.message ?? "").join("\n"),
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
                  追加
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
