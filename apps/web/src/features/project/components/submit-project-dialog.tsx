import type { ReactNode } from "react";
import { useRef } from "react";
import { Button } from "@akabase/ui/components/button";
import { CloseButton } from "@akabase/ui/components/close-button";
import { Dialog } from "@akabase/ui/components/dialog";
import { Field } from "@akabase/ui/components/field";
import { Textarea } from "@akabase/ui/components/textarea";
import { toaster } from "@akabase/ui/components/toast";
import { Portal } from "@ark-ui/react/portal";
import { useDialogContext } from "@ark-ui/react/dialog";
import { Result } from "@akabase/result";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { submitProjectInputSchema, useSubmitProjectMutationOption } from "../actions/mutations";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { ProjectId } from "@akabase/domain/project/schema";
import { nl2br } from "@/libs/text";
import { useParams, useRouter } from "@tanstack/react-router";

type SubmitProjectDialogProps = {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
  children: ReactNode;
};

export function SubmitProjectDialog({
  eventId,
  orgId,
  projectId,
  children,
}: SubmitProjectDialogProps) {
  return (
    <Dialog.Root size="lg">
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <SubmitProjectDialogContent eventId={eventId} orgId={orgId} projectId={projectId} />
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function SubmitProjectDialogContent({
  eventId,
  orgId,
  projectId,
}: {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
}) {
  const dialog = useDialogContext();
  const { mutateAsync: submitProject } = useMutation(useSubmitProjectMutationOption());
  const { slug } = useParams({ strict: false });
  const router = useRouter();
  const submissionIdRef = useRef<string | null>(null);

  const form = useForm({
    defaultValues: {
      message: null as string | null,
    },
    validators: {
      onDynamic: submitProjectInputSchema.pick({ message: true }),
      onSubmitAsync: async ({ value }) => {
        try {
          const result = await submitProject({
            data: {
              projectId,
              eventId,
              orgId,
              message: value.message?.trim() || null,
            },
          });

          if (Result.isFailure(result)) {
            toaster.create({
              type: "error",
              title: "提出失敗",
              description: result.error.message,
            });
            return {};
          }

          submissionIdRef.current = result.value.submissionId;
          return undefined;
        } catch (error) {
          console.error("Failed to submit project:", error);
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
        title: "提出しました",
        description: "企画を提出しました。承認をお待ちください。",
      });
      form.reset();
      dialog.setOpen(false);

      // Navigate to submission detail page
      if (!submissionIdRef.current || !slug) {
        return;
      }
      await router.navigate({
        to: "/$slug/orgs/$orgId/projects/$projectId/submissions/$submissionId",
        params: {
          slug,
          orgId,
          projectId,
          submissionId: submissionIdRef.current,
        },
      });
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
          <Dialog.Title>企画を提出</Dialog.Title>
          <Dialog.Description>
            企画を提出しますか？提出後は下書きを編集できますが、提出内容は変更されません。
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Body>
          <form.Field name="message">
            {(field) => (
              <Field.Root w="full" invalid={!field.state.meta.isValid}>
                <Field.Label>備考（任意）</Field.Label>
                <Textarea
                  placeholder="提出時のメモや補足があれば入力してください"
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
              <Button type="submit" loading={isSubmitting} disabled={!canSubmit}>
                提出する
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
