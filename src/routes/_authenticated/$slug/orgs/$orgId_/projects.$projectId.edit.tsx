import { ClientOnly, Link, createFileRoute, useBlocker } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Container, Flex, Stack } from "@archive/styled-system/jsx";
import { Alert, Badge, Button, Field, Heading, Select, Textarea, toaster } from "@/components/ui";
import { ArrowLeftIcon, SaveIcon, SendIcon } from "lucide-react";
import { revalidateLogic, useForm, useStore } from "@tanstack/react-form";
import { Result } from "@praha/byethrow";
import {
  generateLoadDraftQueryOptions,
  updateProjectDraftInputSchema,
  useUpdateProjectDraftMutation,
} from "@/features/project/actions";
import { RichTextEditor, SubmitProjectDialog } from "@/features/project/components";
import { generateLoadTagsQueryOptions } from "@/features/event/actions/queries/tag";
import { generateLoadDeadlinesQueryOptions } from "@/features/event/actions/queries/deadline";
import { generateCheckOrganizationPermissionsQueryOptions } from "@/features/authorization/actions/queries";
import { nl2br } from "@/libs/text";
import { createListCollection } from "@ark-ui/react/collection";
import { Portal } from "@ark-ui/react/portal";
import { getDeadlineMessage, getFieldDeadlineStatus } from "@/features/project/utils/deadline";
import { PROJECT_MAX_TAGS, PROJECT_PAMPHLET_TEXT_MAX_LENGTH } from "@/domain/project/schema";
import type { OrgId, ProjectId } from "@/domain/shared/ids";
import { cast } from "@/domain/shared/ids";
import z from "zod";
import { getBlockedFieldKeys } from "@/domain/event/logic";
import { confirm } from "@/components/confirm";
import { handleNotFoundError } from "@/libs/error";

const hasReachedMax = <T,>(value: T[]) => value.length >= PROJECT_MAX_TAGS;

export const Route = createFileRoute("/_authenticated/$slug/orgs/$orgId_/projects/$projectId/edit")(
  {
    loader: async ({ params, context }) => {
      const event = context.activeEvent;
      await Promise.all([
        context.queryClient.ensureQueryData(
          generateLoadDraftQueryOptions(event.id, params.orgId, params.projectId),
        ),
        context.queryClient.ensureQueryData(generateLoadTagsQueryOptions(event.id)),
        context.queryClient.ensureQueryData(
          generateCheckOrganizationPermissionsQueryOptions(event.id, params.orgId),
        ),
        context.queryClient.ensureQueryData(generateLoadDeadlinesQueryOptions(event.id)),
      ]);
    },
    component: ProjectEditPage,
    onError: handleNotFoundError,
  },
);

function ProjectEditPage() {
  const { slug, orgId, projectId } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();

  const { data: draft } = useSuspenseQuery(
    generateLoadDraftQueryOptions(event.id, orgId, projectId),
  );
  const { data: tags } = useSuspenseQuery(generateLoadTagsQueryOptions(event.id));
  const { data: permissions } = useSuspenseQuery(
    generateCheckOrganizationPermissionsQueryOptions(event.id, orgId),
  );
  const { data: deadlines } = useSuspenseQuery(generateLoadDeadlinesQueryOptions(event.id));
  const { mutateAsync } = useUpdateProjectDraftMutation();

  // Calculate blocked fields once
  const now = new Date();
  const blockedFields = getBlockedFieldKeys(deadlines, now);

  const form = useForm({
    defaultValues: {
      pamphletText: draft?.pamphletText ?? "",
      tags: draft?.tags.map((tag) => tag.id as string) ?? [],
      webContentJson: (draft?.webContentJson ?? null) as unknown,
    },
    validators: {
      onDynamic: z.object({
        pamphletText: updateProjectDraftInputSchema.shape.pamphletText,
        tags: updateProjectDraftInputSchema.shape.tags,
        webContentJson: z.unknown(),
      }),
      onSubmitAsync: async ({ value }) => {
        const result = await updateProjectDraftInputSchema["~standard"].validate({
          ...value,
          projectId,
          eventId: event.id,
          orgId,
        });
        if (result.issues != null) {
          return value;
        }
        const data = result.value;
        try {
          const result = await mutateAsync({
            data,
          });

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
          console.error("Failed to update draft:", error);
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
      form.reset();
      toaster.create({
        type: "success",
        title: "保存しました",
        description: "下書きを保存しました",
      });
    },
  });

  const [selectedTags, isDefaultValue] = useStore(form.store, (state) => [
    state.values.tags,
    state.isDefaultValue,
  ]);

  const tagsCollection = createListCollection({
    items: tags.map((tag) => ({
      label: tag.name,
      value: tag.id,
      disabled: hasReachedMax(selectedTags) && !selectedTags.includes(tag.id),
    })),
  });

  useBlocker({
    shouldBlockFn: async () => {
      if (isDefaultValue) return false;

      const result = await confirm({
        title: "変更が保存されていません。",
        description: "このページから移動すると、保存されていない変更は失われます。よろしいですか？",
        cancelText: "このページに留まる",
        confirmText: "移動する",
      });

      return !result;
    },
    enableBeforeUnload: !isDefaultValue,
  });

  return (
    <Container maxW="4xl" py="8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <Stack gap="8">
          <div>
            <Button variant="plain" size="sm" mb="4" asChild>
              <Link to="/$slug/orgs/$orgId/projects/$projectId" params={{ slug, orgId, projectId }}>
                <ArrowLeftIcon />
                企画詳細に戻る
              </Link>
            </Button>
            <Heading as="h1" textStyle="2xl" fontWeight="bold">
              企画を編集
            </Heading>
          </div>
          <Stack gap="6">
            <form.Field name="pamphletText">
              {(field) => {
                const status = getFieldDeadlineStatus("pamphlet_text", deadlines, now);
                const isBlocked = blockedFields.has("pamphlet_text");
                const deadlineMsg = getDeadlineMessage("pamphlet_text", deadlines, now);

                // 編集期間開始前の場合はフィールドを非表示
                if (status === "before_start") {
                  return (
                    <Alert.Root colorPalette="gray">
                      <Alert.Content>
                        <Alert.Title>パンフレット用説明</Alert.Title>
                        <Alert.Description>{deadlineMsg}</Alert.Description>
                      </Alert.Content>
                    </Alert.Root>
                  );
                }

                return (
                  <Field.Root invalid={!field.state.meta.isValid}>
                    <Field.Label htmlFor={field.name}>
                      パンフレット用説明（{PROJECT_PAMPHLET_TEXT_MAX_LENGTH}文字以内）
                      {isBlocked && (
                        <Badge ml="2" variant="subtle">
                          編集不可
                        </Badge>
                      )}
                    </Field.Label>
                    <Textarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="パンフレットに掲載される説明文"
                      rows={3}
                      disabled={isBlocked}
                    />
                    {!field.state.meta.isValid && (
                      <Field.ErrorText>
                        {nl2br(
                          field.state.meta.errors.map((error) => error?.message ?? "").join("\n"),
                        )}
                      </Field.ErrorText>
                    )}
                    <Field.HelperText>
                      {isBlocked && deadlineMsg
                        ? deadlineMsg
                        : `残り: ${PROJECT_PAMPHLET_TEXT_MAX_LENGTH - field.state.value.length}文字`}
                    </Field.HelperText>
                  </Field.Root>
                );
              }}
            </form.Field>

            <form.Field name="tags">
              {(field) => {
                const status = getFieldDeadlineStatus("tags", deadlines, now);
                const isBlocked = blockedFields.has("tags");
                const deadlineMsg = getDeadlineMessage("tags", deadlines, now);

                // 編集期間開始前の場合はフィールドを非表示
                if (status === "before_start") {
                  return (
                    <Alert.Root colorPalette="gray">
                      <Alert.Content>
                        <Alert.Title>タグ</Alert.Title>
                        <Alert.Description>{deadlineMsg}</Alert.Description>
                      </Alert.Content>
                    </Alert.Root>
                  );
                }

                return (
                  <Field.Root invalid={!field.state.meta.isValid}>
                    <Field.Label htmlFor={field.name}>
                      タグ
                      {isBlocked && (
                        <Badge ml="2" variant="subtle">
                          編集不可
                        </Badge>
                      )}
                    </Field.Label>
                    <Select.Root
                      collection={tagsCollection}
                      value={field.state.value}
                      onValueChange={({ value }) => {
                        const tagOrder = new Map<string, number>(tags.map((t, i) => [t.id, i]));
                        field.handleChange(
                          value.toSorted((a, b) => (tagOrder.get(a) ?? 0) - (tagOrder.get(b) ?? 0)),
                        );
                      }}
                      positioning={{ sameWidth: true }}
                      multiple
                      disabled={isBlocked}
                    >
                      <Select.Control>
                        <Select.Trigger>
                          <Select.ValueText placeholder="タグを選択" />
                          <Select.Indicator />
                        </Select.Trigger>
                      </Select.Control>
                      <Portal>
                        <Select.Positioner>
                          <Select.Content>
                            {tagsCollection.items.map((option) => (
                              <Select.Item key={option.value} item={option}>
                                <Select.ItemText>{option.label}</Select.ItemText>
                                <Select.ItemIndicator />
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Positioner>
                      </Portal>
                    </Select.Root>
                    {!field.state.meta.isValid && (
                      <Field.ErrorText>
                        {nl2br(
                          field.state.meta.errors.map((error) => error?.message ?? "").join("\n"),
                        )}
                      </Field.ErrorText>
                    )}
                    <Field.HelperText>
                      {isBlocked && deadlineMsg
                        ? deadlineMsg
                        : `企画のカテゴリに該当するタグを選択してください（最大${PROJECT_MAX_TAGS}個）`}
                    </Field.HelperText>
                  </Field.Root>
                );
              }}
            </form.Field>

            <form.Field name="webContentJson">
              {(field) => {
                const status = getFieldDeadlineStatus("web_content", deadlines, now);
                const isBlocked = blockedFields.has("web_content");
                const deadlineMsg = getDeadlineMessage("web_content", deadlines, now);

                // 編集期間開始前の場合はフィールドを非表示
                if (status === "before_start") {
                  return (
                    <Alert.Root colorPalette="gray">
                      <Alert.Content>
                        <Alert.Title>Web用コンテンツ</Alert.Title>
                        <Alert.Description>{deadlineMsg}</Alert.Description>
                      </Alert.Content>
                    </Alert.Root>
                  );
                }

                return (
                  <Field.Root invalid={!field.state.meta.isValid}>
                    <Field.Label htmlFor={field.name}>
                      Web用コンテンツ
                      {isBlocked && (
                        <Badge ml="2" variant="subtle">
                          編集不可
                        </Badge>
                      )}
                    </Field.Label>
                    <ClientOnly>
                      <RichTextEditor
                        value={field.state.value}
                        onChange={(value) => field.handleChange(value)}
                        onBlur={field.handleBlur}
                        invalid={!field.state.meta.isValid}
                        placeholder="企画のWeb用コンテンツを入力してください"
                        disabled={isBlocked}
                        imageScope={{ type: "project", eventId: event.id, projectId }}
                      />
                    </ClientOnly>
                    {!field.state.meta.isValid && (
                      <Field.ErrorText>
                        {nl2br(
                          field.state.meta.errors.map((error) => error?.message ?? "").join("\n"),
                        )}
                      </Field.ErrorText>
                    )}
                    <Field.HelperText>
                      {isBlocked && deadlineMsg
                        ? deadlineMsg
                        : "Webサイト用の詳細な企画説明を入力できます"}
                    </Field.HelperText>
                  </Field.Root>
                );
              }}
            </form.Field>

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting, state.isDefaultValue]}
            >
              {([canSubmit, isFormSubmitting, isDefaultValue]) => (
                <Flex justify="flex-end" gap="2">
                  {permissions.canSubmitProject && (
                    <SubmitProjectDialog
                      eventId={event.id}
                      orgId={cast<OrgId>(orgId)}
                      projectId={cast<ProjectId>(projectId)}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canSubmit || !isDefaultValue}
                      >
                        <SendIcon />
                        提出する
                      </Button>
                    </SubmitProjectDialog>
                  )}
                  <Button
                    type="submit"
                    loading={isFormSubmitting}
                    disabled={!canSubmit || isDefaultValue}
                  >
                    <SaveIcon />
                    保存
                  </Button>
                </Flex>
              )}
            </form.Subscribe>
          </Stack>
        </Stack>
      </form>
    </Container>
  );
}
