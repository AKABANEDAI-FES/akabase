import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Flex, Stack } from "@archive/styled-system/jsx";
import { Button } from "@archive/ui/components/button";
import { Field } from "@archive/ui/components/field";
import { Input } from "@archive/ui/components/input";
import { Select } from "@archive/ui/components/select";
import { toaster } from "@archive/ui/components/toast";
import { SaveIcon } from "lucide-react";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Result } from "@archive/result";
import { generateLoadProjectDetailQueryOptions } from "../actions/queries";
import { updateProjectInputSchema, useUpdateProjectMutationOption } from "../actions/mutations";
import { generateLoadPlacesQueryOptions } from "@/features/event/actions/queries/place";
import { nl2br } from "@/libs/text";
import { createListCollection } from "@ark-ui/react/collection";
import { Portal } from "@ark-ui/react/portal";
import type { OrgId } from "@archive/domain/organization/schema";
import type { ProjectId } from "@archive/domain/project/schema";
import { cast } from "@archive/domain/shared/ids";
import { z } from "zod";
import { LogoUploadField } from "./logo-upload-field";

type ProjectBasicInfoFormProps = {
  projectId: string;
  eventId: string;
  orgId: string;
};

export function ProjectBasicInfoForm({ projectId, eventId, orgId }: ProjectBasicInfoFormProps) {
  const { mutateAsync: updateProjectMutate } = useMutation(useUpdateProjectMutationOption());

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
      logoImageId: project.logoImageId,
    },
    validators: {
      onDynamic: z.object({
        name: updateProjectInputSchema.shape.name,
        placeId: updateProjectInputSchema.shape.placeId,
        logoImageId: updateProjectInputSchema.shape.logoImageId,
      }),
      onSubmitAsync: async ({ value }) => {
        try {
          const projectData = updateProjectInputSchema.parse({
            projectId: cast<ProjectId>(projectId),
            eventId,
            orgId: cast<OrgId>(orgId),
            name: value.name,
            placeId: value.placeId,
            logoImageId: value.logoImageId,
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
      form.reset();
      toaster.create({
        type: "success",
        title: "保存しました",
        description: "基本情報を更新しました",
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

        <form.Field name="logoImageId">
          {(field) => (
            <LogoUploadField
              currentLogoUrl={project.logoUrl}
              onLogoChange={(logoImageId) => field.handleChange(logoImageId)}
              scope={{ type: "pending" }}
            />
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
