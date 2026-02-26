import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Container, Flex, Stack } from "styled-system/jsx";
import { Button, Heading, Text } from "@/components/ui";
import { EditIcon, HistoryIcon } from "lucide-react";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions";
import {
  generateLoadProjectDetailQueryOptions,
  generateLoadProjectPublishedQueryOptions,
} from "@/features/project/actions/queries";
import { ProjectPublishedDataCard } from "@/features/project/components";
import { cast } from "@/domain/shared/ids";
import type { OrgId, ProjectId } from "@/domain/shared/ids";

export const Route = createFileRoute("/_authenticated/$slug/orgs/$orgId_/projects/$projectId/")({
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
    ]);
  },
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { slug, orgId, projectId } = Route.useParams();

  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));
  const { data: project } = useSuspenseQuery(
    generateLoadProjectDetailQueryOptions(event.id, orgId, projectId),
  );

  return (
    <Container maxW="4xl" py="8">
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <div>
            <Heading as="h1" textStyle="2xl" fontWeight="bold">
              {project.name}
            </Heading>
            <Text textStyle="sm" color="fg.muted">
              最終更新: {new Date(project.updatedAt).toLocaleDateString("ja-JP")}
            </Text>
          </div>
        </Flex>

        <Flex gap="2">
          <Button asChild>
            <Link
              to="/$slug/orgs/$orgId/projects/$projectId/edit"
              params={{ slug, orgId, projectId }}
            >
              <EditIcon />
              編集する
            </Link>
          </Button>
          <Button variant="plain" asChild>
            <Link
              to="/$slug/orgs/$orgId/projects/$projectId/submissions"
              params={{ slug, orgId, projectId }}
            >
              <HistoryIcon />
              提出履歴
            </Link>
          </Button>
        </Flex>

        <ProjectPublishedDataCard
          eventId={event.id}
          orgId={cast<OrgId>(orgId)}
          projectId={cast<ProjectId>(projectId)}
        />
      </Stack>
    </Container>
  );
}
