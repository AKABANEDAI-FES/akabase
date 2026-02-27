import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Container, Flex, Stack } from "styled-system/jsx";
import { Button, Heading, Text } from "@/components/ui";
import { ArrowLeftIcon, EditIcon, HistoryIcon, MapPinIcon } from "lucide-react";
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
        <div>
          <Button variant="plain" size="sm" mb="4" asChild>
            <Link to="/$slug/orgs/$orgId" params={{ slug, orgId }}>
              <ArrowLeftIcon />
              組織に戻る
            </Link>
          </Button>
          <Flex gap="5" align="start">
            {project.logoUrl && (
              <img
                src={project.logoUrl}
                alt={`${project.name}のロゴ`}
                width={80}
                height={80}
                style={{ objectFit: "contain", borderRadius: "8px", flexShrink: 0 }}
              />
            )}
            <Stack gap="1">
              <Heading as="h1" textStyle="2xl" fontWeight="bold">
                {project.name}
              </Heading>
              {project.placeName && (
                <Flex align="center" gap="1" color="fg.muted">
                  <MapPinIcon size={16} />
                  <Text textStyle="sm">{project.placeName}</Text>
                </Flex>
              )}
            </Stack>
          </Flex>
        </div>

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
