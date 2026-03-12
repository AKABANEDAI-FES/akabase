import { useSuspenseQuery } from "@tanstack/react-query";
import { Flex } from "@archive/styled-system/jsx";
import { XCircleIcon } from "lucide-react";
import { Button } from "@archive/ui/components/button";
import { Card } from "@archive/ui/components/card";
import { Text } from "@archive/ui/components/text";
import type { SubmissionDetail } from "@archive/application/query/project/get-submission-detail";
import type { EventId } from "@archive/domain/event/schema";
import type { OrgId } from "@archive/domain/organization/schema";
import { generateCheckOrganizationPermissionsQueryOptions } from "@/features/authorization/actions/queries";
import { WithdrawSubmissionDialog } from "./withdraw-submission-dialog";

type SubmissionActionsTabForOrgProps = {
  submission: SubmissionDetail;
  eventId: EventId;
  orgId: OrgId;
};

export function SubmissionActionsTabForOrg({
  submission,
  eventId,
  orgId,
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
              projectId={submission.projectId}
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
