import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Result } from "@akabase/result";
import { useMutation } from "@tanstack/react-query";
import { updateEventInputSchema, useUpdateEventMutationOption } from "../actions/mutations";
import type { EventDetail } from "@akabase/application/query/event/get-event-detail";
import { Button } from "@akabase/ui/components/button";
import { Field } from "@akabase/ui/components/field";
import { Fieldset } from "@akabase/ui/components/fieldset";
import { Input } from "@akabase/ui/components/input";
import { toaster } from "@akabase/ui/components/toast";
import { nl2br } from "@/libs/text";
import { EVENT_ERROR_CODE } from "@akabase/domain/event/errors";

type UpdateEventFormProps = {
  event: EventDetail;
};

/**
 * Event basic information edit form
 */
export function UpdateEventForm({ event }: UpdateEventFormProps) {
  const isArchived = event.status === "archived";
  const { mutateAsync } = useMutation(useUpdateEventMutationOption());

  const form = useForm({
    defaultValues: {
      name: event.name,
      slug: event.slug,
    },
    validators: {
      onDynamic: updateEventInputSchema.omit({ id: true }),
      onSubmitAsync: async ({ value }) => {
        try {
          const result = await mutateAsync({
            data: {
              id: event.id,
              name: value.name,
              slug: value.slug,
            },
          });

          if (Result.isFailure(result)) {
            // Slug重複エラーの場合、フィールドエラーとして返す
            if (result.error.code === EVENT_ERROR_CODE.SLUG_NOT_UNIQUE) {
              return {
                fields: {
                  slug: {
                    message: result.error.message,
                  },
                },
              };
            }

            // その他のエラーはtoastで表示
            toaster.create({
              type: "error",
              title: "エラー",
              description: result.error.message,
            });
            return {};
          }

          // 成功時は何も返さない（onSubmitが実行される）
          return undefined;
        } catch (error) {
          // Handle unexpected errors
          console.error("Failed to update event:", error);
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
      // onSubmitAsyncが成功した場合のみ実行される
      toaster.create({
        type: "success",
        title: "イベントを更新しました",
        description: `「${value.name}」を更新しました`,
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
      <Fieldset.Root>
        <Fieldset.Control>
          <Fieldset.Legend>基本情報</Fieldset.Legend>
          <Fieldset.HelperText>イベントの基本情報を編集します</Fieldset.HelperText>
        </Fieldset.Control>
        <Fieldset.Content>
          {/* Name field */}
          <form.Field name="name">
            {(field) => (
              <Field.Root invalid={!field.state.meta.isValid}>
                <Field.Label htmlFor={field.name}>
                  イベント名 <Field.RequiredIndicator />
                </Field.Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="例: 2025年度白山祭"
                  disabled={isArchived}
                />
                {!field.state.meta.isValid && (
                  <Field.ErrorText>
                    {nl2br(field.state.meta.errors.map((error) => error?.message ?? "").join("\n"))}
                  </Field.ErrorText>
                )}
                <Field.HelperText>イベントの正式名称を入力してください</Field.HelperText>
              </Field.Root>
            )}
          </form.Field>

          {/* Slug field */}
          <form.Field name="slug">
            {(field) => (
              <Field.Root invalid={!field.state.meta.isValid}>
                <Field.Label htmlFor={field.name}>
                  スラッグ (URL識別子) <Field.RequiredIndicator />
                </Field.Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="例: 2025"
                  disabled={isArchived}
                />
                {!field.state.meta.isValid && (
                  <Field.ErrorText>
                    {nl2br(field.state.meta.errors.map((error) => error?.message ?? "").join("\n"))}
                  </Field.ErrorText>
                )}
                <Field.HelperText>
                  URLに使用されます。変更すると既存のリンクが無効になる可能性があります。
                </Field.HelperText>
              </Field.Root>
            )}
          </form.Field>

          {/* Submit button */}
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" loading={isSubmitting} disabled={!canSubmit || isArchived}>
                更新
              </Button>
            )}
          </form.Subscribe>
        </Fieldset.Content>
      </Fieldset.Root>
    </form>
  );
}
