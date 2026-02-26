import { useSuspenseQuery } from "@tanstack/react-query";
import { Flex, Stack } from "styled-system/jsx";
import { Badge, Card, Text } from "@/components/ui";
import { generateLoadProjectPublishedQueryOptions } from "@/features/project/actions/queries";
import type { EventId, OrgId, ProjectId } from "@/domain/shared/ids";

interface ProjectPublishedDataCardProps {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
}

export function ProjectPublishedDataCard({
  eventId,
  orgId,
  projectId,
}: ProjectPublishedDataCardProps) {
  const { data: publishedData } = useSuspenseQuery(
    generateLoadProjectPublishedQueryOptions(eventId, orgId, projectId),
  );

  if (!publishedData) {
    return (
      <Card.Root>
        <Card.Header>
          <Card.Title>公開データ</Card.Title>
        </Card.Header>
        <Card.Body>
          <Text color="fg.muted">まだ公開されていません。</Text>
        </Card.Body>
      </Card.Root>
    );
  }

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>公開データ</Card.Title>
        <Card.Description>現在公開されている企画情報</Card.Description>
      </Card.Header>
      <Card.Body>
        <Stack gap="4">
          <div>
            <Text fontWeight="medium">パンフレット用説明</Text>
            <Text>{publishedData.pamphletText}</Text>
          </div>
          <div>
            <Text fontWeight="medium">タグ</Text>
            <Flex gap="2">
              {publishedData.tags.map((tag) => (
                <Badge key={tag.id}>{tag.name}</Badge>
              ))}
            </Flex>
          </div>
          <div>
            <Text fontWeight="medium">Web用コンテンツ</Text>
            <pre>
              {publishedData.webContentJson
                ? JSON.stringify(publishedData.webContentJson, null, 2)
                : "未設定"}
            </pre>
          </div>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}
