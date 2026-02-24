import { useState } from "react";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Result } from "@praha/byethrow";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Button,
  CloseButton,
  Dialog,
  Field,
  IconButton,
  Input,
  Table,
  toaster,
} from "@/components/ui";
import { Portal } from "@ark-ui/react/portal";
import { Flex, Stack } from "styled-system/jsx";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import type { EventId } from "@/domain/shared/ids";
import type { TagListItem } from "@/application/query/event/list-tags";
import {
  createTagInputSchema,
  updateTagInputSchema,
  useCreateTagMutation,
  useDeleteTagMutation,
  useUpdateTagMutation,
} from "@/features/event/actions/mutations";
import { generateCheckIsCommitteeAdminQueryOptions } from "@/features/authorization/actions";
import { nl2br } from "@/libs/text";

interface TagManagementTableProps {
  tags: TagListItem[];
  eventId: EventId;
}

/**
 * Tag management table component with CRUD operations
 */
export function TagManagementTable({ tags, eventId }: TagManagementTableProps) {
  const { data: authCheck } = useSuspenseQuery(generateCheckIsCommitteeAdminQueryOptions(eventId));
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagListItem | null>(null);
  const [deletingTag, setDeletingTag] = useState<TagListItem | null>(null);

  if (!authCheck.isCommitteeAdmin) {
    return <p>タグ管理は委員会管理者のみが利用できます。</p>;
  }

  return (
    <>
      <Flex justify="space-between" align="center" mb="4">
        <p>{tags.length}件のタグ</p>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PlusIcon />
          タグを追加
        </Button>
      </Flex>

      {tags.length === 0 ? (
        <p>タグがまだありません。新しいタグを追加してください。</p>
      ) : (
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>タグ名</Table.Header>
              <Table.Header>作成日</Table.Header>
              <Table.Header>操作</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {tags.map((tag) => (
              <Table.Row key={tag.id}>
                <Table.Cell fontWeight="medium">{tag.name}</Table.Cell>
                <Table.Cell>{new Date(tag.createdAt).toLocaleDateString("ja-JP")}</Table.Cell>
                <Table.Cell>
                  <Flex gap="2">
                    <IconButton
                      aria-label="編集"
                      variant="plain"
                      size="sm"
                      onClick={() => setEditingTag(tag)}
                    >
                      <PencilIcon />
                    </IconButton>
                    <IconButton
                      aria-label="削除"
                      variant="plain"
                      size="sm"
                      colorPalette="red"
                      onClick={() => setDeletingTag(tag)}
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
      <CreateTagDialog
        eventId={eventId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Edit Dialog */}
      {editingTag && (
        <EditTagDialog
          eventId={eventId}
          tag={editingTag}
          open={!!editingTag}
          onOpenChange={(open) => !open && setEditingTag(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingTag && (
        <DeleteTagDialog
          eventId={eventId}
          tag={deletingTag}
          open={!!deletingTag}
          onOpenChange={(open) => !open && setDeletingTag(null)}
        />
      )}
    </>
  );
}

interface CreateTagDialogProps {
  eventId: EventId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateTagDialog({ eventId, open, onOpenChange }: CreateTagDialogProps) {
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

interface EditTagDialogProps {
  eventId: EventId;
  tag: TagListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditTagDialog({ eventId, tag, open, onOpenChange }: EditTagDialogProps) {
  const { mutateAsync } = useUpdateTagMutation();

  const form = useForm({
    defaultValues: {
      name: tag.name,
    },
    validators: {
      onDynamic: updateTagInputSchema.omit({ tagId: true, eventId: true }),
      onSubmitAsync: async ({ value }) => {
        try {
          const result = await mutateAsync({
            data: { ...value, tagId: tag.id, eventId },
          });

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
          console.error("Failed to update tag:", error);
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
        title: "タグを更新しました",
        description: `「${value.name}」を更新しました`,
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
                <Dialog.Title>タグを編集</Dialog.Title>
                <Dialog.Description>タグ情報を編集します</Dialog.Description>
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

interface DeleteTagDialogProps {
  eventId: EventId;
  tag: TagListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DeleteTagDialog({ eventId, tag, open, onOpenChange }: DeleteTagDialogProps) {
  const { mutateAsync, isPending } = useDeleteTagMutation();

  const handleDelete = async () => {
    try {
      const result = await mutateAsync({ data: { tagId: tag.id, eventId } });

      if (Result.isFailure(result)) {
        toaster.create({
          type: "error",
          title: "エラー",
          description: result.error.message,
        });
        return;
      }

      toaster.create({
        type: "success",
        title: "タグを削除しました",
        description: `「${tag.name}」を削除しました`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete tag:", error);
      toaster.create({
        type: "error",
        title: "エラー",
        description: "予期しないエラーが発生しました",
      });
    }
  };

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
              <Dialog.Title>タグを削除</Dialog.Title>
              <Dialog.Description>
                本当に「{tag.name}」を削除しますか？この操作は取り消せません。
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
