import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Result } from "@praha/byethrow";
import { dependencies } from "@/infrastructure/di";
import { createEvent } from "@/application/command/event/create-event";
import { authMiddleware } from "@/libs/session-server";
import { cast } from "@/domain/shared/ids";
import type { UserId } from "@/domain/shared/ids";
import { Button, CloseButton, Dialog, Field, Input, toaster } from "@/components/ui";
import { Portal } from "@ark-ui/react/portal";
import { Stack } from "styled-system/jsx";
import { eventSchema } from "@/domain/event/schema";
import { useState } from "react";
import { nl2br } from "@/libs/text";

/**
 * Create event input validation schema
 * ドメインスキーマから必要なフィールドをpickして使用
 */
const createEventInputSchema = eventSchema.pick({ name: true, slug: true });

/**
 * Server function to create event
 */
const createEventFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(createEventInputSchema)
  .handler(async ({ data, context }) => {
    // Call use case
    const result = await createEvent(dependencies, {
      name: data.name,
      slug: data.slug,
      userId: cast<UserId>(context.session.user.id),
    });

    return result;
  });

/**
 * Create event route
 */
export const Route = createFileRoute("/admin/events/new")({
  component: CreateEventPage,
});

/**
 * Create event page component
 */
function CreateEventPage() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
    },
    validators: {
      onDynamic: createEventInputSchema,
      onSubmitAsync: async ({ value }) => {
        try {
          const result = await createEventFn({ data: value });

          if (Result.isFailure(result)) {
            // Slug重複エラーの場合、フィールドエラーとして返す
            if (result.error.code === "SLUG_NOT_UNIQUE") {
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
            return;
          }

          // 成功時は何も返さない（onSubmitが実行される）
          return undefined;
        } catch (error) {
          // Handle unexpected errors
          toaster.create({
            type: "error",
            title: "エラー",
            description: "予期しないエラーが発生しました",
          });
          return;
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
        title: "イベントを作成しました",
        description: `「${value.name}」を作成しました`,
      });

      // Redirect to event list
      setOpen(false);
    },
  });

  return (
    <Dialog.Root
      open={open}
      onOpenChange={({ open }) => setOpen(open)}
      onExitComplete={() => navigate({ to: "/admin/events" })}
      size="lg"
    >
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
                <Dialog.Title>イベントを作成</Dialog.Title>
                <Dialog.Description>新しいイベントの情報を入力してください</Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="6" w="full">
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
                        />
                        {!field.state.meta.isValid && (
                          <Field.ErrorText>
                            {nl2br(
                              field.state.meta.errors
                                .map((error) => error?.message ?? "")
                                .join("\n"),
                            )}
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
                        />
                        {!field.state.meta.isValid && (
                          <Field.ErrorText>
                            {nl2br(
                              field.state.meta.errors
                                .map((error) => error?.message ?? "")
                                .join("\n"),
                            )}
                          </Field.ErrorText>
                        )}
                        <Field.HelperText>
                          URLに使用される一意の識別子です（小文字英数字とハイフンのみ）
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
