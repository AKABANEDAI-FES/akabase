import { useSuspenseQuery } from "@tanstack/react-query";
import { Flex, Stack } from "@akabase/styled-system/jsx";
import { Badge } from "@akabase/ui/components/badge";
import { Card } from "@akabase/ui/components/card";
import { Text } from "@akabase/ui/components/text";
import { generateLoadProjectPublishedQueryOptions } from "../actions/queries";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { ProjectId } from "@akabase/domain/project/schema";
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
