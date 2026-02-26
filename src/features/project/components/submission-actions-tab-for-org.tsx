import { useSuspenseQuery } from "@tanstack/react-query";
import { Flex } from "styled-system/jsx";
import { XCircleIcon } from "lucide-react";
import { Button, Card, Text } from "@/components/ui";
import type { SubmissionDetailForOrg } from "@/application/query/project/get-submission-detail-for-org";
import type { EventId, OrgId, ProjectId } from "@/domain/shared/ids";
import { generateCheckOrganizationPermissionsQueryOptions } from "@/features/authorization/actions/queries";
import { WithdrawSubmissionDialog } from "@/features/project/components";

interface SubmissionActionsTabForOrgProps {
  submission: SubmissionDetailForOrg;
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
}

export function SubmissionActionsTabForOrg({
  submission,
  eventId,
  orgId,
  projectId,
}: SubmissionActionsTabForOrgProps) {
  const { data: permissions } = useSuspenseQuery(
    generateCheckOrganizationPermissionsQueryOptions(eventId, orgId),
  );

  const canWithdraw = submission.status === "submitted" && permissions.canWithdrawSubmission;

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>アクション</Card.Title>
        <Card.Description>
          この提出に対してアクションを実行できます（マネージャーのみ）。
        </Card.Description>
      </Card.Header>
      <Card.Body>
        {!permissions.canWithdrawSubmission && (
          <Text color="fg.muted">マネージャーのみが取り下げ操作を実行できます。</Text>
        )}
        {permissions.canWithdrawSubmission && (
          <Flex gap="3" flexWrap="wrap">
            <WithdrawSubmissionDialog
              submissionId={submission.id}
              eventId={eventId}
              orgId={orgId}
              projectId={projectId}
            >
              <Button variant="outline" colorPalette="orange" disabled={!canWithdraw}>
                <XCircleIcon />
                取り下げる
              </Button>
            </WithdrawSubmissionDialog>
          </Flex>
        )}
      </Card.Body>
    </Card.Root>
  );
}
