import { useSuspenseQuery } from "@tanstack/react-query";
import { Flex, Stack } from "@archive/styled-system/jsx";
import { Badge } from "@archive/ui/components/badge";
import { Card } from "@archive/ui/components/card";
import { Text } from "@archive/ui/components/text";
import { generateLoadProjectPublishedQueryOptions } from "../actions/queries";
import type { EventId } from "@archive/domain/event/schema";
import type { OrgId } from "@archive/domain/organization/schema";
import type { ProjectId } from "@archive/domain/project/schema";
import { TipTapContentRenderer } from "./tiptap-content-renderer";

type ProjectPublishedDataCardProps = {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
};

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
          <Card.Title>公開用データ</Card.Title>
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
        <Card.Title>公開用データ</Card.Title>
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
            <TipTapContentRenderer content={publishedData.webContentJson} />
          </div>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}
