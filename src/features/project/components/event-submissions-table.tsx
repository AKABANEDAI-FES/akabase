import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button, Table, Text } from "@/components/ui";
import { SubmissionStatusBadge } from "./submission-status-badge";
import { generateLoadEventSubmissionsQueryOptions } from "@/features/project/actions/queries";
import type { EventSubmissionListItem } from "@/application/query/project/list-event-submissions";
import type { EventId } from "@/domain/shared/ids";

interface EventSubmissionsTableProps {
  eventId: EventId;
  slug: string;
}

export function EventSubmissionsTable({ eventId, slug }: EventSubmissionsTableProps) {
  const { data: submissions } = useSuspenseQuery(generateLoadEventSubmissionsQueryOptions(eventId));

  if (submissions.length === 0) {
    return <Text>まだ提出がありません。</Text>;
  }

  return (
    <Table.Root>
      <Table.Head>
        <Table.Row>
          <Table.Header>出展団体名</Table.Header>
          <Table.Header>企画名</Table.Header>
          <Table.Header>提出日時</Table.Header>
          <Table.Header>提出者</Table.Header>
          <Table.Header>ステータス</Table.Header>
          <Table.Header>承認数</Table.Header>
          <Table.Header />
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {submissions.map((submission) => (
          <SubmissionRow key={submission.id} submission={submission} slug={slug} />
        ))}
      </Table.Body>
    </Table.Root>
  );
}

function SubmissionRow({
  submission,
  slug,
}: {
  submission: EventSubmissionListItem;
  slug: string;
}) {
  return (
    <Table.Row>
      <Table.Cell fontWeight="medium">{submission.orgName}</Table.Cell>
      <Table.Cell>{submission.projectName}</Table.Cell>
      <Table.Cell>
        {submission.submittedAt.toLocaleString("ja-JP", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Table.Cell>
      <Table.Cell>{submission.submittedBy}</Table.Cell>
      <Table.Cell>
        <SubmissionStatusBadge status={submission.status} />
      </Table.Cell>
      <Table.Cell>
        {submission.approvalCount}/{submission.requiredApprovals}
      </Table.Cell>
      <Table.Cell>
        <Button variant="plain" size="sm" asChild>
          <Link
            to="/$slug/orgs/$orgId/projects/$projectId"
            params={{
              slug,
              orgId: submission.orgId,
              projectId: submission.projectId,
            }}
          >
            詳細
          </Link>
        </Button>
      </Table.Cell>
    </Table.Row>
  );
}
