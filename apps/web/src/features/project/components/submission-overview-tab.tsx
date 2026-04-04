import { Flex, Grid, HStack, Stack } from "@akabase/styled-system/jsx";
import { TagIcon } from "lucide-react";
import { Badge } from "@akabase/ui/components/badge";
import { Card } from "@akabase/ui/components/card";
import { Text } from "@akabase/ui/components/text";
import type { SubmissionDetail } from "@akabase/application/query/project/get-submission-detail";
import { TipTapContentRenderer } from "./tiptap-content-renderer";
import { FormatDate } from "@/libs/date";

type SubmissionOverviewTabProps = {
  submission: SubmissionDetail;
};

export function SubmissionOverviewTab({ submission }: SubmissionOverviewTabProps) {
  return (
    <Stack gap="4">
      <Grid columns={{ base: 1, md: 2 }} gap="4">
        <SubmissionInfoCard submission={submission} />
        <SubmissionTagsCard tags={submission.tags} />
      </Grid>
      <Card.Root>
        <Card.Header>
          <Card.Title>パンフレットテキスト</Card.Title>
        </Card.Header>
        <Card.Body>
          <Text whiteSpace="pre-wrap">
            {submission.pamphletText || (
              <Text as="span" color="fg.muted">
                (未入力)
              </Text>
            )}
          </Text>
        </Card.Body>
      </Card.Root>
      <Card.Root>
        <Card.Header>
          <Card.Title>Web用コンテンツ</Card.Title>
        </Card.Header>
        <Card.Body>
          <TipTapContentRenderer content={submission.webContentJson} />
        </Card.Body>
      </Card.Root>
    </Stack>
  );
}

function SubmissionInfoCard({
  submission,
}: {
  submission: Pick<SubmissionDetail, "submittedBy" | "submittedAt">;
}) {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>提出情報</Card.Title>
      </Card.Header>
      <Card.Body>
        <Stack gap="2">
          <Flex justify="space-between">
            <Text textStyle="sm" color="fg.muted">
              提出者
            </Text>
            <Text textStyle="sm">{submission.submittedBy}</Text>
          </Flex>
          <Flex justify="space-between">
            <Text textStyle="sm" color="fg.muted">
              提出日時
            </Text>
            <Text textStyle="sm">
              <FormatDate
                value={submission.submittedAt}
                option={{ dateStyle: "medium", timeStyle: "short" }}
              />
            </Text>
          </Flex>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}

function SubmissionTagsCard({ tags }: { tags: { id: string; name: string }[] }) {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>
          <HStack gap="2" _icon={{ boxSize: "1em" }}>
            <TagIcon />
            タグ
          </HStack>
        </Card.Title>
      </Card.Header>
      <Card.Body>
        {tags.length > 0 ? (
          <Flex gap="2" flexWrap="wrap">
            {tags.map((tag) => (
              <Badge key={tag.id} size="lg" variant="outline">
                {tag.name}
              </Badge>
            ))}
          </Flex>
        ) : (
          <Text textStyle="sm" color="fg.muted">
            タグなし
          </Text>
        )}
      </Card.Body>
    </Card.Root>
  );
}
