import { startTransition, useState } from "react";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Result } from "@praha/byethrow";
import { Portal } from "@ark-ui/react/portal";
import { createListCollection, useAsyncList } from "@ark-ui/react/collection";
import {
  Button,
  CloseButton,
  Combobox,
  Dialog,
  Field,
  Select,
  Spinner,
  Text,
  toaster,
} from "@/components/ui";
import { Stack } from "styled-system/jsx";
import {
  addOrganizationMemberInputSchema,
  useAddOrganizationMemberMutation,
} from "@/features/organization/actions/mutations";
import { searchUsersByEmailFn } from "@/features/organization/actions/queries";
import { ORG_ROLES, ORG_ROLE_LABELS } from "@/domain/authorization/schema";
import type { OrgMemberRole } from "@/domain/organization/schema";
import type { ComboboxInputValueChangeDetails, ComboboxValueChangeDetails } from "@ark-ui/react";
import type { UserSearchResult } from "@/application/query/user/search-users-by-email";
import { nl2br } from "@/libs/text";
import { ORGANIZATION_ERROR_CODE } from "@/domain/organization/errors";
import type { EventId, OrgId } from "@/domain/shared/ids";

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
}

export function AddMemberDialog({ orgId, eventId, defaultOpen, onClose }: AddMemberDialogProps) {
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
}: {
  orgId: OrgId;
  eventId: EventId;
  onSuccess: () => void;
}) {
  const { mutateAsync } = useAddOrganizationMemberMutation();

  const list = useAsyncList<UserSearchResult>({
    load: async ({ signal, filterText: query }) => {
      if (!query) {
        return { items: [] };
      }
      const items = await searchUsersByEmailFn({ data: { query, eventId }, signal });
      return { items };
    },
  });

  const collection = createListCollection({
    items: list.items,
    itemToString: (item) => `${item.name} (${item.email})`,
    itemToValue: (item) => item.id,
  });

  const form = useForm({
    defaultValues: {
      userId: null as string | null,
      role: "manager" as OrgMemberRole,
    },
    validators: {
      onDynamic: addOrganizationMemberInputSchema.omit({ eventId: true, orgId: true }),
      onSubmitAsync: async ({ value }) => {
        const data = addOrganizationMemberInputSchema.parse({
          eventId,
          orgId,
          userId: value.userId,
          role: value.role,
        });
        try {
          const result = await mutateAsync({ data });

          if (Result.isFailure(result)) {
            if (result.error.code === ORGANIZATION_ERROR_CODE.USER_ALREADY_MEMBER) {
              return {
                fields: {
                  userId: { message: result.error.message },
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
      const selectedUser = list.items.find((u) => u.id === form.getFieldValue("userId"));
      toaster.create({
        type: "success",
        title: "メンバーを追加しました",
        description: selectedUser ? `「${selectedUser.name}」を追加しました` : undefined,
      });

      onSuccess();
    },
  });

  const handleInputChange = (details: ComboboxInputValueChangeDetails) => {
    if (details.reason === "input-change") {
      startTransition(() => {
        list.setFilterText(details.inputValue);
      });
    }
  };

  const handleValueChange = (details: ComboboxValueChangeDetails) => {
    form.setFieldValue("userId", details.value[0] ?? null);
  };

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
            <form.Field name="userId">
              {(field) => (
                <Field.Root invalid={!field.state.meta.isValid}>
                  <Combobox.Root
                    collection={collection}
                    onInputValueChange={handleInputChange}
                    onValueChange={handleValueChange}
                    value={field.state.value ? [field.state.value] : []}
                  >
                    <Combobox.Label>ユーザー検索</Combobox.Label>
                    <Combobox.Control>
                      <Combobox.Input placeholder="example@toyo.jp" />
                      <Combobox.IndicatorGroup>
                        <Combobox.ClearTrigger />
                        <Combobox.Trigger />
                      </Combobox.IndicatorGroup>
                    </Combobox.Control>
                    <Combobox.Positioner>
                      <Combobox.Content>
                        {list.loading ? (
                          <Combobox.Empty gap="2">
                            <Spinner size="sm" />
                            ユーザーを検索中...
                          </Combobox.Empty>
                        ) : list.error ? (
                          <Combobox.Empty>
                            <Text color="red.default">{list.error.message}</Text>
                          </Combobox.Empty>
                        ) : list.items.length === 0 ? (
                          <Combobox.Empty>ユーザーが見つかりません</Combobox.Empty>
                        ) : null}
                        {collection.items.map((item) => (
                          <Combobox.Item item={item} key={item.id}>
                            {`${item.name} (${item.email})`}
                            <Combobox.ItemIndicator />
                          </Combobox.Item>
                        ))}
                      </Combobox.Content>
                    </Combobox.Positioner>
                  </Combobox.Root>
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
