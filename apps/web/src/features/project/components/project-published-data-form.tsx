import { ClientOnly } from "@tanstack/react-router";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Flex, Stack } from "@akabase/styled-system/jsx";
import { Alert } from "@akabase/ui/components/alert";
import { Button } from "@akabase/ui/components/button";
import { Field } from "@akabase/ui/components/field";
import { Input } from "@akabase/ui/components/input";
import { Select } from "@akabase/ui/components/select";
import { Textarea } from "@akabase/ui/components/textarea";
import { toaster } from "@akabase/ui/components/toast";
import { SaveIcon } from "lucide-react";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Result } from "@akabase/result";
import { generateLoadProjectPublishedQueryOptions } from "../actions/queries";
import { updatePublishedInputSchema, useUpdatePublishedMutationOption } from "../actions/mutations";
import { generateLoadTagsQueryOptions } from "@/features/event/actions/queries/tag";
import { generateLoadEventSettingsQueryOptions } from "@/features/event/actions/queries/event-settings";
import { PROJECT_DETAIL_INFO_FIELDS } from "../utils/detail-info";
import { RichTextEditor } from "./editor";
import { nl2br } from "@/libs/text";
import { createListCollection } from "@ark-ui/react/collection";
import { Portal } from "@ark-ui/react/portal";
import {
  PROJECT_MAX_TAGS,
  pamphletTextSchema,
  resolvePamphletTextMaxLength,
} from "@akabase/domain/project/schema";
import type { ProjectId } from "@akabase/domain/project/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { TagId } from "@akabase/domain/event/schema";
import { cast } from "@akabase/domain/shared/ids";
import { z } from "zod";

const hasReachedMax = <T,>(value: T[]) => value.length >= PROJECT_MAX_TAGS;

type ProjectPublishedDataFormProps = {
  projectId: string;
  eventId: string;
  orgId: string;
};

export function ProjectPublishedDataForm({
  projectId,
  eventId,
  orgId,
}: ProjectPublishedDataFormProps) {
  const { mutateAsync: updatePublishedMutate } = useMutation(useUpdatePublishedMutationOption());

  const { data: published } = useSuspenseQuery(
    generateLoadProjectPublishedQueryOptions(eventId, orgId, projectId),
  );
  const { data: tags } = useSuspenseQuery(generateLoadTagsQueryOptions(eventId));
  const { data: eventSettings } = useSuspenseQuery(generateLoadEventSettingsQueryOptions(eventId));
  const pamphletTextMaxLength = resolvePamphletTextMaxLength(eventSettings);

  const selectedTags = published?.tags.map((t) => t.id) ?? [];
  const tagsCollection = createListCollection({
    items: tags.map((tag) => ({
      label: tag.name,
      value: tag.id,
      disabled: hasReachedMax(selectedTags) && !selectedTags.includes(tag.id),
    })),
  });

  const form = useForm({
    defaultValues: {
      pamphletText: published?.pamphletText ?? "",
      webContentJson: (published?.webContentJson ?? null) as unknown,
      openingHours: published?.openingHours ?? "",
      lastEntryTime: published?.lastEntryTime ?? "",
      tags: published?.tags.map((tag) => tag.id as string) ?? [],
    },
    validators: {
      onDynamic: z.object({
        pamphletText: pamphletTextSchema(pamphletTextMaxLength),
        webContentJson: z.unknown(),
        openingHours: updatePublishedInputSchema.shape.openingHours,
        lastEntryTime: updatePublishedInputSchema.shape.lastEntryTime,
        tags: updatePublishedInputSchema.shape.tags,
      }),
      onSubmitAsync: async ({ value }) => {
        try {
          if (!published) {
            toaster.create({
              type: "error",
              title: "エラー",
              description: "この企画はまだ承認されていません",
            });
            return {};
          }

          const publishedData = updatePublishedInputSchema.parse({
            projectId: cast<ProjectId>(projectId),
            eventId,
            orgId: cast<OrgId>(orgId),
            pamphletText: value.pamphletText,
            webContentJson: value.webContentJson,
            openingHours: value.openingHours,
            lastEntryTime: value.lastEntryTime,
            tags: value.tags.map((id) => cast<TagId>(id)),
          });

          const result = await updatePublishedMutate({ data: publishedData });

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
          console.error("Failed to update published data:", error);
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
        description: "公開用データを更新しました",
      });
    },
  });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await form.handleSubmit();
      }}
    >
      <Stack gap="6" pt="6">
        {!published && (
          <Alert.Root>
            <Alert.Content>
              <Alert.Title>未承認</Alert.Title>
              <Alert.Description>
                この企画はまだ承認されていないため、公開コンテンツを編集できません。
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        <form.Field name="pamphletText">
          {(field) => (
            <Field.Root invalid={!field.state.meta.isValid}>
              <Field.Label htmlFor={field.name}>
                パンフレット用説明（{pamphletTextMaxLength}文字以内）
              </Field.Label>
              <Textarea
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="パンフレットに掲載される説明文"
                rows={3}
                disabled={!published}
              />
              {!field.state.meta.isValid && (
                <Field.ErrorText>
                  {nl2br(field.state.meta.errors.map((error) => error?.message ?? "").join("\n"))}
                </Field.ErrorText>
              )}
              <Field.HelperText>
                残り: {pamphletTextMaxLength - field.state.value.trim().length}文字
              </Field.HelperText>
            </Field.Root>
          )}
        </form.Field>

        {PROJECT_DETAIL_INFO_FIELDS.map(({ name, label, placeholder, helperText }) => (
          <form.Field key={name} name={name}>
            {(field) => (
              <Field.Root invalid={!field.state.meta.isValid}>
                <Field.Label htmlFor={field.name}>{label}</Field.Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={placeholder}
                  disabled={!published}
                />
                {!field.state.meta.isValid && (
                  <Field.ErrorText>
                    {nl2br(field.state.meta.errors.map((error) => error?.message ?? "").join("\n"))}
                  </Field.ErrorText>
                )}
                <Field.HelperText>{helperText}</Field.HelperText>
              </Field.Root>
            )}
          </form.Field>
        ))}

        <form.Field name="tags">
          {(field) => (
            <Field.Root invalid={!field.state.meta.isValid}>
              <Field.Label htmlFor={field.name}>タグ</Field.Label>
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
                disabled={!published}
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
                  {nl2br(field.state.meta.errors.map((error) => error?.message ?? "").join("\n"))}
                </Field.ErrorText>
              )}
              <Field.HelperText>
                企画のカテゴリに該当するタグを選択してください（最大{PROJECT_MAX_TAGS}個）
              </Field.HelperText>
            </Field.Root>
          )}
        </form.Field>

        <form.Field name="webContentJson">
          {(field) => (
            <Field.Root invalid={!field.state.meta.isValid}>
              <Field.Label htmlFor={field.name}>Web用コンテンツ</Field.Label>
              <ClientOnly>
                <RichTextEditor
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                  onBlur={field.handleBlur}
                  invalid={!field.state.meta.isValid}
                  placeholder="企画のWeb用コンテンツを入力してください"
                  disabled={!published}
                  imageScope={{ type: "project", eventId, projectId }}
                />
              </ClientOnly>
              {!field.state.meta.isValid && (
                <Field.ErrorText>
                  {nl2br(field.state.meta.errors.map((error) => error?.message ?? "").join("\n"))}
                </Field.ErrorText>
              )}
              <Field.HelperText>Webサイト用の詳細な企画説明を入力できます</Field.HelperText>
            </Field.Root>
          )}
        </form.Field>

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting, state.isDefaultValue]}
        >
          {([canSubmit, isFormSubmitting, isDefaultValue]) => (
            <Flex justify="flex-end" gap="2">
              <Button
                type="submit"
                loading={isFormSubmitting}
                disabled={!canSubmit || isDefaultValue || !published}
              >
                <SaveIcon />
                保存
              </Button>
            </Flex>
          )}
        </form.Subscribe>
      </Stack>
    </form>
  );
}
