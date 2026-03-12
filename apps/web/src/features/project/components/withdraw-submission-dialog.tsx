import type { ReactNode } from "react";
import { Button } from "@archive/ui/components/button";
import { CloseButton } from "@archive/ui/components/close-button";
import { Dialog } from "@archive/ui/components/dialog";
import { Field } from "@archive/ui/components/field";
import { Textarea } from "@archive/ui/components/textarea";
import { toaster } from "@archive/ui/components/toast";
import { Portal } from "@ark-ui/react/portal";
import { useDialogContext } from "@ark-ui/react/dialog";
import { Result } from "@archive/result";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useWithdrawSubmissionMutationOption } from "../actions/mutations";
import type { EventId } from "@archive/domain/event/schema";
import type { OrgId } from "@archive/domain/organization/schema";
import type { ProjectId, SubmissionId } from "@archive/domain/project/schema";

type WithdrawSubmissionDialogProps = {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
  submissionId: SubmissionId;
  children: ReactNode;
};

export function WithdrawSubmissionDialog({
  eventId,
  orgId,
  projectId,
  submissionId,
  children,
}: WithdrawSubmissionDialogProps) {
  return (
    <Dialog.Root size="lg">
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <WithdrawSubmissionDialogContent
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

function WithdrawSubmissionDialogContent({
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
  const { mutateAsync: withdrawSubmission } = useMutation(useWithdrawSubmissionMutationOption());

  const form = useForm({
    defaultValues: {
      reason: "" as string,
    },
    validators: {
      onSubmitAsync: async ({ value }) => {
        try {
          const result = await withdrawSubmission({
            data: {
              submissionId,
              eventId,
              orgId,
              projectId,
              reason: value.reason || undefined,
            },
          });

          if (Result.isFailure(result)) {
            toaster.create({
              type: "error",
              title: "取り下げ失敗",
              description: result.error.message,
            });
            return {};
          }

          return undefined;
        } catch (error) {
          console.error("Failed to withdraw submission:", error);
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
        title: "取り下げました",
        description: "提出を取り下げました。",
      });
      form.reset();
      dialog.setOpen(false);
    },
  });

  return (
    <Dialog.Content asChild>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await form.handleSubmit();
        }}
      >
        <Dialog.Header>
          <Dialog.Title>提出を取り下げる</Dialog.Title>
          <Dialog.Description>
            この提出を取り下げます。取り下げ後は再提出が必要です。理由があれば入力してください（任意）。
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Body>
          <form.Field name="reason">
            {(field) => (
              <Field.Root w="full">
                <Field.Label>取り下げ理由（任意）</Field.Label>
                <Textarea
                  placeholder="取り下げ理由があれば入力してください（任意）"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  rows={3}
                />
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
                取り下げる
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
