import { useMemo, useState } from "react";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Result } from "@praha/byethrow";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createListCollection } from "@ark-ui/react/collection";
import {
  Button,
  CloseButton,
  Dialog,
  Field,
  IconButton,
  Input,
  Select,
  Table,
  toaster,
} from "@/components/ui";
import { Portal } from "@ark-ui/react/portal";
import { Flex, Stack } from "styled-system/jsx";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import type { EventId } from "@/domain/shared/ids";
import type { DeadlineListItem } from "@/application/query/event/list-deadlines";
import { DEADLINE_FIELD_KEYS, DEADLINE_FIELD_LABELS } from "@/domain/event/schema";
import type { DeadlineFieldKey } from "@/domain/event/schema";
import {
  createDeadlineInputSchema,
  updateDeadlineInputSchema,
  useCreateDeadlineMutation,
  useDeleteDeadlineMutation,
  useUpdateDeadlineMutation,
} from "@/features/event/actions/mutations";
import { generateCheckIsCommitteeAdminQueryOptions } from "@/features/authorization/actions";
import { nl2br } from "@/libs/text";

interface DeadlineManagementTableProps {
  deadlines: DeadlineListItem[];
  eventId: EventId;
}

/**
 * Deadline management table component with CRUD operations
 */
export function DeadlineManagementTable({ deadlines, eventId }: DeadlineManagementTableProps) {
  const { data: authCheck } = useSuspenseQuery(generateCheckIsCommitteeAdminQueryOptions(eventId));
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<DeadlineListItem | null>(null);
  const [deletingDeadline, setDeletingDeadline] = useState<DeadlineListItem | null>(null);

  if (!authCheck.isCommitteeAdmin) {
    return <p>締切管理は委員会管理者のみが利用できます。</p>;
  }

  return (
    <>
      <Flex justify="space-between" align="center" mb="4">
        <p>{deadlines.length}件の締切</p>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PlusIcon />
          締切を追加
        </Button>
      </Flex>

      {deadlines.length === 0 ? (
        <p>締切がまだありません。新しい締切を追加してください。</p>
      ) : (
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>フィールド</Table.Header>
              <Table.Header>締切日時</Table.Header>
              <Table.Header>作成日</Table.Header>
              <Table.Header>操作</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {deadlines.map((deadline) => (
              <Table.Row key={deadline.id}>
                <Table.Cell fontWeight="medium">
                  {DEADLINE_FIELD_LABELS[deadline.fieldKey as DeadlineFieldKey] ||
                    deadline.fieldKey}
                </Table.Cell>
                <Table.Cell>
                  {new Date(deadline.deadlineAt).toLocaleString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Table.Cell>
                <Table.Cell>{new Date(deadline.createdAt).toLocaleDateString("ja-JP")}</Table.Cell>
                <Table.Cell>
                  <Flex gap="2">
                    <IconButton
                      aria-label="編集"
                      variant="plain"
                      size="sm"
                      onClick={() => setEditingDeadline(deadline)}
                    >
                      <PencilIcon />
                    </IconButton>
                    <IconButton
                      aria-label="削除"
                      variant="plain"
                      size="sm"
                      colorPalette="red"
                      onClick={() => setDeletingDeadline(deadline)}
                    >
                      <Trash2Icon />
                    </IconButton>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      {/* Create Dialog */}
      <CreateDeadlineDialog
        eventId={eventId}
        existingDeadlines={deadlines}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Edit Dialog */}
      {editingDeadline && (
        <EditDeadlineDialog
          eventId={eventId}
          deadline={editingDeadline}
          open={!!editingDeadline}
          onOpenChange={(open) => !open && setEditingDeadline(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingDeadline && (
        <DeleteDeadlineDialog
          eventId={eventId}
          deadline={deletingDeadline}
          open={!!deletingDeadline}
          onOpenChange={(open) => !open && setDeletingDeadline(null)}
        />
      )}
    </>
  );
}

interface CreateDeadlineDialogProps {
  eventId: EventId;
  existingDeadlines: DeadlineListItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateDeadlineDialog({
  eventId,
  existingDeadlines,
  open,
  onOpenChange,
}: CreateDeadlineDialogProps) {
  const { mutateAsync } = useCreateDeadlineMutation();

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
      deadlineAt: new Date(),
    },
    validators: {
      onDynamic: createDeadlineInputSchema.omit({ eventId: true }),
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
        DEADLINE_FIELD_LABELS[value.fieldKey as DeadlineFieldKey] || value.fieldKey;
      toaster.create({
        type: "success",
        title: "締切を作成しました",
        description: `「${fieldLabel}」の締切を設定しました`,
      });
      form.reset();
      onOpenChange(false);
    },
  });

  return (
    <Dialog.Root open={open} onOpenChange={({ open }) => onOpenChange(open)} size="md">
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
                          onValueChange={({ value }) => field.handleChange(value[0])}
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

                  <form.Field name="deadlineAt">
                    {(field) => (
                      <Field.Root invalid={!field.state.meta.isValid}>
                        <Field.Label htmlFor={field.name}>
                          締切日時 <Field.RequiredIndicator />
                        </Field.Label>
                        <Input
                          type="datetime-local"
                          id={field.name}
                          name={field.name}
                          value={field.state.value.toISOString().slice(0, 16)}
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

interface EditDeadlineDialogProps {
  eventId: EventId;
  deadline: DeadlineListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditDeadlineDialog({ eventId, deadline, open, onOpenChange }: EditDeadlineDialogProps) {
  const { mutateAsync } = useUpdateDeadlineMutation();

  const form = useForm({
    defaultValues: {
      deadlineAt: new Date(deadline.deadlineAt),
    },
    validators: {
      onDynamic: updateDeadlineInputSchema.omit({ eventId: true, deadlineId: true }),
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
      onOpenChange(false);
    },
  });

  return (
    <Dialog.Root open={open} onOpenChange={({ open }) => onOpenChange(open)} size="md">
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
                <Dialog.Title>締切を編集</Dialog.Title>
                <Dialog.Description>締切情報を編集します</Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4" w="full">
                  <Field.Root>
                    <Field.Label>フィールド</Field.Label>
                    <Input
                      value={
                        DEADLINE_FIELD_LABELS[deadline.fieldKey as DeadlineFieldKey] ||
                        deadline.fieldKey
                      }
                      disabled
                    />
                    <Field.HelperText>フィールドは作成後に変更できません</Field.HelperText>
                  </Field.Root>

                  <form.Field name="deadlineAt">
                    {(field) => (
                      <Field.Root invalid={!field.state.meta.isValid}>
                        <Field.Label htmlFor={field.name}>
                          締切日時 <Field.RequiredIndicator />
                        </Field.Label>
                        <Input
                          type="datetime-local"
                          id={field.name}
                          name={field.name}
                          value={field.state.value.toISOString().slice(0, 16)}
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

interface DeleteDeadlineDialogProps {
  eventId: EventId;
  deadline: DeadlineListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DeleteDeadlineDialog({
  eventId,
  deadline,
  open,
  onOpenChange,
}: DeleteDeadlineDialogProps) {
  const { mutateAsync, isPending } = useDeleteDeadlineMutation();

  const handleDelete = async () => {
    try {
      const result = await mutateAsync({ data: { deadlineId: deadline.id, eventId } });

      if (Result.isFailure(result)) {
        toaster.create({
          type: "error",
          title: "エラー",
          description: result.error.message,
        });
        return;
      }

      const fieldLabel =
        DEADLINE_FIELD_LABELS[deadline.fieldKey as DeadlineFieldKey] || deadline.fieldKey;
      toaster.create({
        type: "success",
        title: "締切を削除しました",
        description: `「${fieldLabel}」の締切を削除しました`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete deadline:", error);
      toaster.create({
        type: "error",
        title: "エラー",
        description: "予期しないエラーが発生しました",
      });
    }
  };

  const fieldLabel =
    DEADLINE_FIELD_LABELS[deadline.fieldKey as DeadlineFieldKey] || deadline.fieldKey;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={({ open }) => onOpenChange(open)}
      size="sm"
      role="alertdialog"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>締切を削除</Dialog.Title>
              <Dialog.Description>
                本当に「{fieldLabel}」の締切を削除しますか？この操作は取り消せません。
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button type="button" variant="outline" disabled={isPending}>
                  キャンセル
                </Button>
              </Dialog.ActionTrigger>
              <Button type="button" colorPalette="red" loading={isPending} onClick={handleDelete}>
                削除
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
