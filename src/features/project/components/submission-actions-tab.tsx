import { Flex } from "@archive/styled-system/jsx";
import { CheckCircleIcon, UndoIcon } from "lucide-react";
import { Button, Card } from "@/components/ui";
import type { SubmissionDetail } from "@/application/query/project/get-submission-detail";
import type { EventId } from "@/domain/shared/ids";
import { ApproveProjectDialog, ReturnProjectDialog } from "@/features/project/components";

interface SubmissionActionsTabProps {
  submission: SubmissionDetail;
  eventId: EventId;
}

export function SubmissionActionsTab({ submission, eventId }: SubmissionActionsTabProps) {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>アクション</Card.Title>
        <Card.Description>この提出に対してアクションを実行できます。</Card.Description>
      </Card.Header>
      <Card.Body>
        <Flex gap="3" flexWrap="wrap">
          <ReturnProjectDialog
            submissionId={submission.id}
            eventId={eventId}
            orgId={submission.orgId}
            projectId={submission.projectId}
          >
            <Button variant="outline" colorPalette="red">
              <UndoIcon />
              差し戻す
            </Button>
          </ReturnProjectDialog>
          <ApproveSubmissionButton submission={submission} eventId={eventId} />
        </Flex>
      </Card.Body>
    </Card.Root>
  );
}

function ApproveSubmissionButton({
  submission,
  eventId,
}: {
  submission: SubmissionDetail;
  eventId: EventId;
}) {
  const alreadyApproved = submission.status === "approved";

  return (
    <ApproveProjectDialog eventId={eventId} submissionId={submission.id}>
      <Button colorPalette="green" disabled={alreadyApproved}>
        <CheckCircleIcon />
        承認する
      </Button>
    </ApproveProjectDialog>
  );
}
