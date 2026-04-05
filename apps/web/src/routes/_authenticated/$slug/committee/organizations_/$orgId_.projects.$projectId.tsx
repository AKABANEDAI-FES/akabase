import { Link, createFileRoute } from "@tanstack/react-router";
import { Container, Stack } from "@akabase/styled-system/jsx";
import { Button } from "@akabase/ui/components/button";
import { Heading } from "@akabase/ui/components/heading";
import { Tabs } from "@akabase/ui/components/tabs";
import { ArrowLeftIcon } from "lucide-react";
import {
  generateLoadProjectDetailQueryOptions,
  generateLoadProjectPublishedQueryOptions,
} from "@/features/project/actions/queries";
import { ProjectBasicInfoForm } from "@/features/project/components/project-basic-info-form";
import { ProjectPublishedDataForm } from "@/features/project/components/project-published-data-form";
import { generateLoadTagsQueryOptions } from "@/features/event/actions/queries/tag";
import { generateLoadPlacesQueryOptions } from "@/features/event/actions/queries/place";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions/queries";
import { handleNotFoundError } from "@/libs/error";

export const Route = createFileRoute(
  "/_authenticated/$slug/committee/organizations_/$orgId_/projects/$projectId",
)({
  loader: async ({ params, context }) => {
    const event = context.activeEvent;
    await Promise.all([
      context.queryClient.ensureQueryData(
        generateLoadProjectDetailQueryOptions(event.id, params.orgId, params.projectId),
      ),
      context.queryClient.ensureQueryData(
        generateLoadProjectPublishedQueryOptions(event.id, params.orgId, params.projectId),
      ),
      context.queryClient.ensureQueryData(generateLoadPlacesQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateLoadTagsQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateCheckCommitteePermissionsQueryOptions(event.id)),
    ]);
  },
  component: CommitteeProjectEditPage,
  onError: handleNotFoundError,
});

function CommitteeProjectEditPage() {
  const { slug, orgId, projectId } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();

  return (
    <Container maxW="4xl" py="8">
      <Stack gap="8">
        <div>
          <Button variant="plain" size="sm" mb="4" asChild>
            <Link to="/$slug/committee/organizations/$orgId/projects" params={{ slug, orgId }}>
              <ArrowLeftIcon />
              企画一覧に戻る
            </Link>
          </Button>
          <Heading as="h1" textStyle="2xl" fontWeight="bold">
            企画を編集
          </Heading>
        </div>

        <Tabs.Root defaultValue="basic">
          <Tabs.List>
            <Tabs.Trigger value="basic">基本情報</Tabs.Trigger>
            <Tabs.Trigger value="published">公開用データ</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>

          {/* 基本情報タブ */}
          <Tabs.Content value="basic">
            <ProjectBasicInfoForm projectId={projectId} eventId={event.id} orgId={orgId} />
          </Tabs.Content>

          {/* 公開用データタブ */}
          <Tabs.Content value="published">
            <ProjectPublishedDataForm projectId={projectId} eventId={event.id} orgId={orgId} />
          </Tabs.Content>
        </Tabs.Root>
      </Stack>
    </Container>
  );
}
