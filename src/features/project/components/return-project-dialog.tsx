import type { ReactNode } from "react";
import { Button, CloseButton, Dialog, Field, Textarea, toaster } from "@/components/ui";
import { Portal } from "@ark-ui/react/portal";
import { useDialogContext } from "@ark-ui/react/dialog";
import { Result } from "@praha/byethrow";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import {
  returnProjectInputSchema,
  useReturnProjectMutation,
} from "@/features/project/actions/mutations";
import type { EventId, OrgId, ProjectId, SubmissionId } from "@/domain/shared/ids";
import { nl2br } from "@/libs/text";

interface ReturnProjectDialogProps {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
  submissionId: SubmissionId;
  children: ReactNode;
}

export function ReturnProjectDialog({
  eventId,
  orgId,
  projectId,
  submissionId,
  children,
}: ReturnProjectDialogProps) {
  return (
    <Dialog.Root size="lg">
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <ReturnProjectDialogContent
            eventId={eventId}
            orgId={orgId}
            projectId={projectId}
            submissionId={submissionId}
          />
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function ReturnProjectDialogContent({
  eventId,
  orgId,
  projectId,
  submissionId,
}: {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
  submissionId: SubmissionId;
}) {
  const dialog = useDialogContext();
  const { mutateAsync: returnProject } = useReturnProjectMutation();

  const form = useForm({
    defaultValues: {
      reason: "" as string,
    },
    validators: {
      onDynamic: returnProjectInputSchema.pick({ reason: true }),
      onSubmitAsync: async ({ value }) => {
        try {
          const result = await returnProject({
            data: {
              submissionId,
              eventId,
              orgId,
              projectId,
              reason: value.reason,
            },
          });

          if (Result.isFailure(result)) {
            toaster.create({
              type: "error",
              title: "差し戻し失敗",
              description: result.error.message,
            });
            return {};
          }

          return undefined;
        } catch (error) {
          console.error("Failed to return project:", error);
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
        title: "差し戻しました",
        description: "企画を差し戻しました。団体は下書きを修正して再提出できます。",
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
          <Dialog.Title>提出を差し戻す</Dialog.Title>
          <Dialog.Description>
            この提出を差し戻します。差し戻し理由を入力してください。団体側は下書きを修正して再提出できます。
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Body>
          <form.Field name="reason">
            {(field) => (
              <Field.Root w="full" invalid={!field.state.meta.isValid}>
                <Field.Label>差し戻し理由（必須）</Field.Label>
                <Textarea
                  placeholder="差し戻し理由を入力してください（必須）"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  rows={4}
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
                colorPalette="orange"
              >
                差し戻す
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
