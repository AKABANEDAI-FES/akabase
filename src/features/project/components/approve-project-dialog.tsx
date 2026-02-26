import type { ReactNode } from "react";
import { Button, CloseButton, Dialog, Field, Textarea, toaster } from "@/components/ui";
import { Portal } from "@ark-ui/react/portal";
import { useDialogContext } from "@ark-ui/react/dialog";
import { Result } from "@praha/byethrow";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import {
  approveProjectInputSchema,
  useApproveProjectMutation,
} from "@/features/project/actions/mutations";
import type { EventId, SubmissionId } from "@/domain/shared/ids";
import { nl2br } from "@/libs/text";

interface ApproveProjectDialogProps {
  eventId: EventId;
  submissionId: SubmissionId;
  children: ReactNode;
}

export function ApproveProjectDialog({
  eventId,
  submissionId,
  children,
}: ApproveProjectDialogProps) {
  return (
    <Dialog.Root size="lg">
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <ApproveProjectDialogContent eventId={eventId} submissionId={submissionId} />
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function ApproveProjectDialogContent({
  eventId,
  submissionId,
}: {
  eventId: EventId;
  submissionId: SubmissionId;
}) {
  const dialog = useDialogContext();
  const { mutateAsync: approveProject } = useApproveProjectMutation();

  const form = useForm({
    defaultValues: {
      message: null as string | null,
    },
    validators: {
      onDynamic: approveProjectInputSchema.pick({ message: true }),
      onSubmitAsync: async ({ value }) => {
        try {
          const result = await approveProject({
            data: {
              submissionId,
              eventId,
              message: value.message?.trim() || null,
            },
          });

          if (Result.isFailure(result)) {
            toaster.create({
              type: "error",
              title: "承認失敗",
              description: result.error.message,
            });
            return {};
          }

          return undefined;
        } catch (error) {
          console.error("Failed to approve project:", error);
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
      toaster.create({
        type: "success",
        title: "承認しました",
        description: "企画を承認しました。",
      });
      form.reset();
      dialog.setOpen(false);
    },
  });

  return (
    <Dialog.Content asChild>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <Dialog.Header>
          <Dialog.Title>企画を承認</Dialog.Title>
          <Dialog.Description>
            この企画を承認しますか？承認数が必要数に達すると、自動的に公開データが作成されます。
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Body>
          <form.Field name="message">
            {(field) => (
              <Field.Root w="full" invalid={!field.state.meta.isValid}>
                <Field.Label>承認コメント（任意）</Field.Label>
                <Textarea
                  placeholder="承認時のコメントがあれば入力してください"
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value || null)}
                  rows={3}
                />
                {!field.state.meta.isValid && (
                  <Field.ErrorText>
                    {nl2br(field.state.meta.errors.map((error) => error?.message ?? "").join("\n"))}
                  </Field.ErrorText>
                )}
              </Field.Root>
            )}
          </form.Field>
        </Dialog.Body>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" disabled={isSubmitting}>
                  キャンセル
                </Button>
              </Dialog.ActionTrigger>
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={!canSubmit}
                colorPalette="green"
              >
                承認する
              </Button>
            </Dialog.Footer>
          )}
        </form.Subscribe>
        <Dialog.CloseTrigger asChild>
          <CloseButton />
        </Dialog.CloseTrigger>
      </form>
    </Dialog.Content>
  );
}
