import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Container, Stack } from "styled-system/jsx";
import { Button, Heading, Tabs } from "@/components/ui";
import { ArrowLeftIcon } from "lucide-react";
import {
  generateLoadProjectDetailQueryOptions,
  generateLoadProjectPublishedQueryOptions,
} from "@/features/project/actions";
import { ProjectBasicInfoForm, ProjectPublishedDataForm } from "@/features/project/components";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions";
import { generateLoadTagsQueryOptions } from "@/features/event/actions/queries/tag";
import { generateLoadPlacesQueryOptions } from "@/features/event/actions/queries/place";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions/queries";

export const Route = createFileRoute(
  "/_authenticated/$slug/committee/organizations_/$orgId_/projects/$projectId",
)({
  loader: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
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
});

function CommitteeProjectEditPage() {
  const { slug, orgId, projectId } = Route.useParams();

  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));

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
