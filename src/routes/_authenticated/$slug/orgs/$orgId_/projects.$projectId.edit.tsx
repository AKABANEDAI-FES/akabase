import { Link, createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Container, Flex, Stack } from "styled-system/jsx";
import { Button, Field, Heading, Select, Textarea, toaster } from "@/components/ui";
import { ArrowLeftIcon, SaveIcon, SendIcon } from "lucide-react";
import { revalidateLogic, useForm, useStore } from "@tanstack/react-form";
import { Result } from "@praha/byethrow";
import {
  generateLoadDraftQueryOptions,
  updateProjectDraftInputSchema,
  useUpdateProjectDraftMutation,
} from "@/features/project/actions";
import { SubmitProjectDialog } from "@/features/project/components";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions";
import { generateLoadTagsQueryOptions } from "@/features/event/actions/queries/tag";
import { generateCheckOrganizationPermissionsQueryOptions } from "@/features/authorization/actions/queries";
import { nl2br } from "@/libs/text";
import { createListCollection } from "@ark-ui/react/collection";
import { Portal } from "@ark-ui/react/portal";
import { PROJECT_MAX_TAGS, PROJECT_PAMPHLET_TEXT_MAX_LENGTH } from "@/domain/project/schema";
import type { OrgId, ProjectId } from "@/domain/shared/ids";
import { cast } from "@/domain/shared/ids";

const hasReachedMax = <T,>(value: T[]) => value.length >= PROJECT_MAX_TAGS;

export const Route = createFileRoute("/_authenticated/$slug/orgs/$orgId_/projects/$projectId/edit")(
  {
    loader: async ({ params, context }) => {
      const event = await context.queryClient.ensureQueryData(
        generateLoadEventBySlugQueryOptions(params.slug),
      );
      await Promise.all([
        context.queryClient.ensureQueryData(
          generateLoadDraftQueryOptions(event.id, params.orgId, params.projectId),
        ),
        context.queryClient.ensureQueryData(generateLoadTagsQueryOptions(event.id)),
        context.queryClient.ensureQueryData(
          generateCheckOrganizationPermissionsQueryOptions(event.id, params.orgId),
        ),
      ]);
    },
    component: ProjectEditPage,
  },
);

function ProjectEditPage() {
  const { slug, orgId, projectId } = Route.useParams();

  const queryClient = useQueryClient();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));
  const { data: draft } = useSuspenseQuery(
    generateLoadDraftQueryOptions(event.id, orgId, projectId),
  );
  const { data: tags } = useSuspenseQuery(generateLoadTagsQueryOptions(event.id));
  const { data: permissions } = useSuspenseQuery(
    generateCheckOrganizationPermissionsQueryOptions(event.id, orgId),
  );
  const { mutateAsync } = useUpdateProjectDraftMutation();

  const form = useForm({
    defaultValues: {
      pamphletText: draft?.pamphletText ?? "",
      tags: draft?.tags.map((tag) => tag.id as string) ?? [],
    },
    validators: {
      onDynamic: updateProjectDraftInputSchema.pick({
        pamphletText: true,
        tags: true,
      }),
      onSubmitAsync: async ({ value }) => {
        try {
          const result = await mutateAsync({
            data: { ...value, projectId, eventId: event.id, orgId },
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
      const draft = await queryClient.fetchQuery(
        generateLoadDraftQueryOptions(event.id, orgId, projectId),
      );
      form.reset({
        pamphletText: draft?.pamphletText ?? "",
        tags: draft?.tags.map((tag) => tag.id) ?? [],
      });
      toaster.create({
        type: "success",
        title: "保存しました",
        description: "下書きを保存しました",
      });
    },
  });

  const selectedTags = useStore(form.store, (state) => state.values.tags);
  const tagsCollection = createListCollection({
    items: tags.map((tag) => ({
      label: tag.name,
      value: tag.id,
      disabled: hasReachedMax(selectedTags) && !selectedTags.includes(tag.id),
    })),
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
              {(field) => (
                <Field.Root invalid={!field.state.meta.isValid}>
                  <Field.Label htmlFor={field.name}>
                    パンフレット用説明（{PROJECT_PAMPHLET_TEXT_MAX_LENGTH}文字以内）
                  </Field.Label>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="パンフレットに掲載される説明文"
                    rows={3}
                  />
                  {!field.state.meta.isValid && (
                    <Field.ErrorText>
                      {nl2br(
                        field.state.meta.errors.map((error) => error?.message ?? "").join("\n"),
                      )}
                    </Field.ErrorText>
                  )}
                  <Field.HelperText>
                    残り: {PROJECT_PAMPHLET_TEXT_MAX_LENGTH - field.state.value.length}文字
                  </Field.HelperText>
                </Field.Root>
              )}
            </form.Field>

            <form.Field name="tags">
              {(field) => (
                <Field.Root invalid={!field.state.meta.isValid}>
                  <Field.Label htmlFor={field.name}>タグ</Field.Label>
                  <Select.Root
                    collection={tagsCollection}
                    value={field.state.value}
                    onValueChange={({ value }) => {
                      field.handleChange(value);
                    }}
                    positioning={{ sameWidth: true }}
                    multiple
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
                    企画のカテゴリに該当するタグを選択してください（最大{PROJECT_MAX_TAGS}個）
                  </Field.HelperText>
                </Field.Root>
              )}
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
