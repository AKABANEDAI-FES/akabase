import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Container, Flex, Stack } from "@akabase/styled-system/jsx";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@akabase/ui/components/button";
import { Heading } from "@akabase/ui/components/heading";
import { Tabs } from "@akabase/ui/components/tabs";
import { Text } from "@akabase/ui/components/text";
import { SubmissionActionsTab } from "@/features/project/components/submission-actions-tab";
import { SubmissionHistoryTab } from "@/features/project/components/submission-history-tab";
import { SubmissionOverviewTab } from "@/features/project/components/submission-overview-tab";
import { SubmissionStatusBadge } from "@/features/project/components/submission-status-badge";
import { generateLoadSubmissionDetailQueryOptions } from "@/features/project/actions/queries";
import { handleNotFoundError } from "@/libs/error";

export const Route = createFileRoute("/_authenticated/$slug/committee/submissions_/$submissionId")({
  loader: async ({ params, context }) => {
    const event = context.activeEvent;
    await context.queryClient.ensureQueryData(
      generateLoadSubmissionDetailQueryOptions(event.id, params.submissionId),
    );
  },
  component: SubmissionDetailPage,
  onError: handleNotFoundError,
});

function SubmissionDetailPage() {
  const { slug, submissionId } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();
  const { data: submission } = useSuspenseQuery(
    generateLoadSubmissionDetailQueryOptions(event.id, submissionId),
  );

  const isActionable = submission.status === "submitted";
  const [selectedTab, setSelectedTab] = useState<string>("overview");

  // アクションタブが無効化された場合、概要タブにフォールバック
  const currentTab = !isActionable && selectedTab === "actions" ? "overview" : selectedTab;

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <div>
          <Button variant="plain" size="sm" mb="4" asChild>
            <Link to="/$slug/committee/submissions" params={{ slug }}>
              <ArrowLeftIcon />
              提出一覧に戻る
            </Link>
          </Button>
          <Stack gap="1">
            <Flex gap="1" align="center" justify="space-between">
              <Heading as="h1" textStyle="2xl" fontWeight="bold">
                {submission.projectName}
              </Heading>
              <SubmissionStatusBadge status={submission.status} />
            </Flex>
            <Text color="fg.muted" textStyle="sm">
              {submission.orgName}
            </Text>
          </Stack>
        </div>

        <Tabs.Root
          value={currentTab}
          onValueChange={(details) => setSelectedTab(details.value)}
          variant="line"
          size="md"
        >
          <Tabs.List>
            <Tabs.Trigger value="overview">概要</Tabs.Trigger>
            <Tabs.Trigger value="history">履歴とフィードバック</Tabs.Trigger>
            {isActionable && <Tabs.Trigger value="actions">アクション</Tabs.Trigger>}
            <Tabs.Indicator />
          </Tabs.List>

          <Tabs.Content value="overview" pt="4">
            <SubmissionOverviewTab submission={submission} />
          </Tabs.Content>

          <Tabs.Content value="history" pt="4">
            <SubmissionHistoryTab submission={submission} />
          </Tabs.Content>

          {isActionable && (
            <Tabs.Content value="actions" pt="4">
              <SubmissionActionsTab submission={submission} eventId={event.id} />
            </Tabs.Content>
          )}
        </Tabs.Root>
      </Stack>
    </Container>
  );
}
