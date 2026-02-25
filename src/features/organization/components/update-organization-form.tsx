import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Result } from "@praha/byethrow";
import {
  updateOrganizationInputSchema,
  useUpdateOrganizationMutation,
} from "@/features/organization/actions";
import type { OrganizationDetail } from "@/application/query/organization/get-organization-detail";
import { Button, Field, Fieldset, Input, Textarea, toaster } from "@/components/ui";
import { nl2br } from "@/libs/text";

interface UpdateOrganizationFormProps {
  organization: OrganizationDetail;
  disabled?: boolean;
}

/**
 * Organization basic information edit form
 */
export function UpdateOrganizationForm({ organization, disabled }: UpdateOrganizationFormProps) {
  const { mutateAsync } = useUpdateOrganizationMutation();

  const form = useForm({
    defaultValues: {
      name: organization.name,
      description: organization.description,
    },
    validators: {
      onDynamic: updateOrganizationInputSchema.omit({ eventId: true, id: true }),
      onSubmitAsync: async ({ value }) => {
        try {
          const result = await mutateAsync({
            data: {
              eventId: organization.eventId,
              id: organization.id,
              name: value.name,
              description: value.description,
            },
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
          console.error("Failed to update organization:", error);
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
        title: "団体を更新しました",
        description: `「${value.name}」を更新しました`,
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
      <Fieldset.Root disabled={disabled}>
        <Fieldset.Control>
          <Fieldset.Legend>基本情報</Fieldset.Legend>
          <Fieldset.HelperText>団体の基本情報を編集します</Fieldset.HelperText>
        </Fieldset.Control>
        <Fieldset.Content>
          {/* Name field */}
          <form.Field name="name">
            {(field) => (
              <Field.Root invalid={!field.state.meta.isValid}>
                <Field.Label htmlFor={field.name}>
                  団体名 <Field.RequiredIndicator />
                </Field.Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="例: 〇〇サークル"
                />
                {!field.state.meta.isValid && (
                  <Field.ErrorText>
                    {nl2br(field.state.meta.errors.map((error) => error?.message ?? "").join("\n"))}
                  </Field.ErrorText>
                )}
                <Field.HelperText>団体の正式名称を入力してください（1-100文字）</Field.HelperText>
              </Field.Root>
            )}
          </form.Field>

          {/* Description field */}
          <form.Field name="description">
            {(field) => (
              <Field.Root invalid={!field.state.meta.isValid}>
                <Field.Label htmlFor={field.name}>説明</Field.Label>
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value ?? ""}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="団体の簡単な説明（任意）"
                  rows={3}
                />
                {!field.state.meta.isValid && (
                  <Field.ErrorText>
                    {nl2br(field.state.meta.errors.map((error) => error?.message ?? "").join("\n"))}
                  </Field.ErrorText>
                )}
                <Field.HelperText>団体の説明を入力してください（最大100文字）</Field.HelperText>
              </Field.Root>
            )}
          </form.Field>

          {/* Submit button */}
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" loading={isSubmitting} disabled={disabled || !canSubmit}>
                更新
              </Button>
            )}
          </form.Subscribe>
        </Fieldset.Content>
      </Fieldset.Root>
    </form>
  );
}
