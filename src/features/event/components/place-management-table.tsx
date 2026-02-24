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
import type { EventId, PlaceId } from "@/domain/shared/ids";
import type { PlaceListItem } from "@/application/query/event/list-places";
import {
  createPlaceInputSchema,
  updatePlaceInputSchema,
  useCreatePlaceMutation,
  useDeletePlaceMutation,
  useUpdatePlaceMutation,
} from "@/features/event/actions/mutations";
import { generateCheckIsCommitteeAdminQueryOptions } from "@/features/authorization/actions";
import { nl2br } from "@/libs/text";

interface PlaceManagementTableProps {
  places: PlaceListItem[];
  eventId: EventId;
}

/**
 * Build hierarchical structure for display
 */
function buildPlaceHierarchy(places: PlaceListItem[]) {
  const children = new Map<string | null, PlaceListItem[]>();

  // Group by parent
  for (const place of places) {
    const parentId = place.parentId;
    if (!children.has(parentId)) {
      children.set(parentId, []);
    }
    children.get(parentId)!.push(place);
  }

  // Get root places (no parent)
  const rootPlaces = children.get(null) || [];

  // Flatten with depth
  const result: Array<PlaceListItem & { depth: number }> = [];

  function traverse(place: PlaceListItem, depth: number) {
    result.push({ ...place, depth });
    const childPlaces = children.get(place.id) || [];
    for (const child of childPlaces) {
      traverse(child, depth + 1);
    }
  }

  for (const root of rootPlaces) {
    traverse(root, 0);
  }

  return result;
}

/**
 * Place management table component with CRUD operations
 */
export function PlaceManagementTable({ places, eventId }: PlaceManagementTableProps) {
  const { data: authCheck } = useSuspenseQuery(generateCheckIsCommitteeAdminQueryOptions(eventId));
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<PlaceListItem | null>(null);
  const [deletingPlace, setDeletingPlace] = useState<PlaceListItem | null>(null);

  const hierarchicalPlaces = useMemo(() => buildPlaceHierarchy(places), [places]);

  if (!authCheck.isCommitteeAdmin) {
    return <p>場所管理は委員会管理者のみが利用できます。</p>;
  }

  return (
    <>
      <Flex justify="space-between" align="center" mb="4">
        <p>{places.length}件の場所</p>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PlusIcon />
          場所を追加
        </Button>
      </Flex>

      {places.length === 0 ? (
        <p>場所がまだありません。新しい場所を追加してください。</p>
      ) : (
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>場所名</Table.Header>
              <Table.Header>作成日</Table.Header>
              <Table.Header>操作</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {hierarchicalPlaces.map((place) => (
              <Table.Row key={place.id}>
                <Table.Cell fontWeight="medium">
                  <span style={{ paddingLeft: `${place.depth * 24}px` }}>{place.name}</span>
                </Table.Cell>
                <Table.Cell>{new Date(place.createdAt).toLocaleDateString("ja-JP")}</Table.Cell>
                <Table.Cell>
                  <Flex gap="2">
                    <IconButton
                      aria-label="編集"
                      variant="plain"
                      size="sm"
                      onClick={() => setEditingPlace(place)}
                    >
                      <PencilIcon />
                    </IconButton>
                    <IconButton
                      aria-label="削除"
                      variant="plain"
                      size="sm"
                      colorPalette="red"
                      onClick={() => setDeletingPlace(place)}
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
      <CreatePlaceDialog
        eventId={eventId}
        places={places}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Edit Dialog */}
      {editingPlace && (
        <EditPlaceDialog
          eventId={eventId}
          place={editingPlace}
          open={!!editingPlace}
          onOpenChange={(open) => !open && setEditingPlace(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingPlace && (
        <DeletePlaceDialog
          eventId={eventId}
          place={deletingPlace}
          open={!!deletingPlace}
          onOpenChange={(open) => !open && setDeletingPlace(null)}
        />
      )}
    </>
  );
}

interface CreatePlaceDialogProps {
  eventId: EventId;
  places: PlaceListItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreatePlaceDialog({ eventId, places, open, onOpenChange }: CreatePlaceDialogProps) {
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

interface EditPlaceDialogProps {
  eventId: EventId;
  place: PlaceListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditPlaceDialog({ eventId, place, open, onOpenChange }: EditPlaceDialogProps) {
  const { mutateAsync } = useUpdatePlaceMutation();

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

interface DeletePlaceDialogProps {
  eventId: EventId;
  place: PlaceListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DeletePlaceDialog({ eventId, place, open, onOpenChange }: DeletePlaceDialogProps) {
  const { mutateAsync, isPending } = useDeletePlaceMutation();

  const handleDelete = async () => {
    try {
      const result = await mutateAsync({ data: { placeId: place.id, eventId } });

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
        title: "場所を削除しました",
        description: `「${place.name}」を削除しました`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete place:", error);
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
              <Dialog.Title>場所を削除</Dialog.Title>
              <Dialog.Description>
                本当に「{place.name}
                」を削除しますか？この場所の子要素もすべて削除されます。この操作は取り消せません。
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
