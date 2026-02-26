import { useSuspenseQuery } from "@tanstack/react-query";
import { Stack } from "styled-system/jsx";
import { Card, Text } from "@/components/ui";
import { SubmissionStatusBadge } from "./submission-status-badge";
import { SUBMISSION_ACTION_LABELS } from "@/domain/project/schema";
import { generateLoadSubmissionsQueryOptions } from "@/features/project/actions/queries";
import type { EventId, OrgId, ProjectId } from "@/domain/shared/ids";

interface ProjectSubmissionsHistoryProps {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
}

export function ProjectSubmissionsHistory({
  eventId,
  orgId,
  projectId,
}: ProjectSubmissionsHistoryProps) {
  const { data: submissions } = useSuspenseQuery(
    generateLoadSubmissionsQueryOptions(eventId, orgId, projectId),
  );

  if (submissions.length === 0) {
    return <Text>まだ提出履歴がありません。</Text>;
  }

  return (
    <Stack gap="4">
      {submissions.map((submission) => (
        <Card.Root key={submission.id}>
          <Card.Header
            display="flex"
            flexDir="row"
            justifyContent="space-between"
            alignItems="flex-start"
          >
            <div>
              <Card.Title>
                {submission.submittedAt.toLocaleDateString("ja-JP")}{" "}
                {submission.submittedAt.toLocaleTimeString("ja-JP")}
              </Card.Title>
              <Card.Description>提出者: {submission.submittedBy}</Card.Description>
            </div>
            <SubmissionStatusBadge status={submission.status} />
          </Card.Header>
          <Card.Body>
            <Stack gap="3">
              {submission.currentAction && (
                <>
                  <div>
                    <Text textStyle="sm" color="fg.muted">
                      {SUBMISSION_ACTION_LABELS[submission.currentAction.actionType]}日時:{" "}
                      {submission.currentAction.performedAt.toLocaleString("ja-JP")}
                    </Text>
                    <Text textStyle="sm" color="fg.muted">
                      {SUBMISSION_ACTION_LABELS[submission.currentAction.actionType]}者:{" "}
                      {submission.currentAction.performedBy}
                    </Text>
                  </div>
                  {submission.currentAction.message && (
                    <Card.Root variant="subtle">
                      <Card.Header p="3" pb="2">
                        <Card.Title textStyle="md">コメント</Card.Title>
                      </Card.Header>
                      <Card.Body p="3" pt="0" textStyle="sm">
                        <Text>{submission.currentAction.message}</Text>
                      </Card.Body>
                    </Card.Root>
                  )}
                </>
              )}
            </Stack>
          </Card.Body>
        </Card.Root>
      ))}
    </Stack>
  );
}
