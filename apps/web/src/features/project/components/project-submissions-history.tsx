import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Stack } from "@archive/styled-system/jsx";
import { Card } from "@archive/ui/components/card";
import { Text } from "@archive/ui/components/text";
import { SubmissionStatusBadge } from "./submission-status-badge";
import { SUBMISSION_ACTION_LABELS } from "@archive/domain/project/schema";
import { generateLoadSubmissionsQueryOptions } from "../actions/queries";
import type { EventId } from "@archive/domain/event/schema";
import type { OrgId } from "@archive/domain/organization/schema";
import type { ProjectId } from "@archive/domain/project/schema";
import { FormatDate } from "@/libs/date";

type ProjectSubmissionsHistoryProps = {
  slug: string;
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
};

export function ProjectSubmissionsHistory({
  slug,
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
        <Link
          key={submission.id}
          to="/$slug/orgs/$orgId/projects/$projectId/submissions/$submissionId"
          params={{
            slug,
            orgId,
            projectId,
            submissionId: submission.id,
          }}
          style={{ textDecoration: "none" }}
        >
          <Card.Root _hover={{ bg: "bg.subtle" }} cursor="pointer">
            <Card.Header
              display="flex"
              flexDir="row"
              justifyContent="space-between"
              alignItems="flex-start"
            >
              <div>
                <Card.Title>
                  <FormatDate
                    value={submission.submittedAt}
                    option={{ dateStyle: "medium", timeStyle: "medium" }}
                  />
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
                        <FormatDate
                          value={submission.currentAction.performedAt}
                          option={{ dateStyle: "medium", timeStyle: "short" }}
                        />
                      </Text>
                      <Text textStyle="sm" color="fg.muted">
                        {SUBMISSION_ACTION_LABELS[submission.currentAction.actionType]}者:{" "}
                        {submission.currentAction.performedBy}
                      </Text>
                    </div>
                    {submission.currentAction.message && (
                      <Card.Root variant="subtle" size="sm">
                        <Card.Header>
                          <Card.Title>コメント</Card.Title>
                        </Card.Header>
                        <Card.Body textStyle="sm">
                          <Text>{submission.currentAction.message}</Text>
                        </Card.Body>
                      </Card.Root>
                    )}
                  </>
                )}
              </Stack>
            </Card.Body>
          </Card.Root>
        </Link>
      ))}
    </Stack>
  );
}
