import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Flex, Stack } from "styled-system/jsx";
import { Button, Field, Input, Select, toaster } from "@/components/ui";
import { SaveIcon } from "lucide-react";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Result } from "@praha/byethrow";
import {
  generateLoadProjectDetailQueryOptions,
  updateProjectInputSchema,
  useUpdateProjectMutation,
} from "@/features/project/actions";
import { generateLoadPlacesQueryOptions } from "@/features/event/actions/queries/place";
import { nl2br } from "@/libs/text";
import { createListCollection } from "@ark-ui/react/collection";
import { Portal } from "@ark-ui/react/portal";
import type { OrgId, ProjectId } from "@/domain/shared/ids";
import { cast } from "@/domain/shared/ids";
import z from "zod";

type ProjectBasicInfoFormProps = {
  projectId: string;
  eventId: string;
  orgId: string;
};

export function ProjectBasicInfoForm({ projectId, eventId, orgId }: ProjectBasicInfoFormProps) {
  const queryClient = useQueryClient();
  const { mutateAsync: updateProjectMutate } = useUpdateProjectMutation();

  const { data: project } = useSuspenseQuery(
    generateLoadProjectDetailQueryOptions(eventId, orgId, projectId),
  );
  const { data: places } = useSuspenseQuery(generateLoadPlacesQueryOptions(eventId));

  const placesCollection = createListCollection({
    items: places.map((place) => ({
      label: place.name,
      value: place.id,
    })),
  });

  const form = useForm({
    defaultValues: {
      name: project.name,
      placeId: project.placeId,
    },
    validators: {
      onDynamic: z.object({
        name: updateProjectInputSchema.shape.name,
        placeId: updateProjectInputSchema.shape.placeId,
      }),
      onSubmitAsync: async ({ value }) => {
        try {
          const projectData = updateProjectInputSchema.parse({
            projectId: cast<ProjectId>(projectId),
            eventId,
            orgId: cast<OrgId>(orgId),
            name: value.name,
            placeId: value.placeId,
          });

          const result = await updateProjectMutate({ data: projectData });

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
          console.error("Failed to update project:", error);
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
      const updatedProject = await queryClient.fetchQuery(
        generateLoadProjectDetailQueryOptions(eventId, orgId, projectId),
      );
      form.reset({
        name: updatedProject.name,
        placeId: updatedProject.placeId,
      });

      toaster.create({
        type: "success",
        title: "保存しました",
        description: "基本情報を更新しました",
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <Stack gap="6" pt="6">
        <form.Field name="name">
          {(field) => (
            <Field.Root invalid={!field.state.meta.isValid}>
              <Field.Label htmlFor={field.name}>企画名（必須）</Field.Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="企画名を入力"
              />
              {!field.state.meta.isValid && (
                <Field.ErrorText>
                  {nl2br(field.state.meta.errors.map((error) => error?.message ?? "").join("\n"))}
                </Field.ErrorText>
              )}
            </Field.Root>
          )}
        </form.Field>

        <form.Field name="placeId">
          {(field) => (
            <Field.Root invalid={!field.state.meta.isValid}>
              <Field.Label htmlFor={field.name}>開催場所</Field.Label>
              <Select.Root
                collection={placesCollection}
                value={field.state.value ? [field.state.value] : []}
                onValueChange={({ value }) => {
                  field.handleChange(value[0] ?? null);
                }}
                positioning={{ sameWidth: true }}
              >
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder="開催場所を選択" />
                    <Select.Indicator />
                  </Select.Trigger>
                </Select.Control>
                <Portal>
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
                </Portal>
              </Select.Root>
              {!field.state.meta.isValid && (
                <Field.ErrorText>
                  {nl2br(field.state.meta.errors.map((error) => error?.message ?? "").join("\n"))}
                </Field.ErrorText>
              )}
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
                disabled={!canSubmit || isDefaultValue}
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
