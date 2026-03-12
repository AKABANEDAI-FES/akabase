import { Link, createFileRoute } from "@tanstack/react-router";
import { Container, Stack } from "@archive/styled-system/jsx";
import { Button } from "@archive/ui/components/button";
import { Heading } from "@archive/ui/components/heading";
import { ArrowLeftIcon } from "lucide-react";
import { generateLoadSubmissionsQueryOptions } from "@/features/project/actions/queries";
import { ProjectSubmissionsHistory } from "@/features/project/components/project-submissions-history";
import { cast } from "@archive/domain/shared/ids";
import type { OrgId } from "@archive/domain/organization/schema";
import type { ProjectId } from "@archive/domain/project/schema";

export const Route = createFileRoute(
  "/_authenticated/$slug/orgs/$orgId_/projects/$projectId/submissions",
)({
  loader: async ({ params, context }) => {
    const event = context.activeEvent;
    await context.queryClient.ensureQueryData(
      generateLoadSubmissionsQueryOptions(event.id, params.orgId, params.projectId),
    );
  },
  component: ProjectSubmissionsPage,
});

function ProjectSubmissionsPage() {
  const { slug, orgId, projectId } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();

  return (
    <Container maxW="4xl" py="8">
      <Stack gap="6">
        <div>
          <Button variant="plain" size="sm" mb="4" asChild>
            <Link to="/$slug/orgs/$orgId/projects/$projectId" params={{ slug, orgId, projectId }}>
              <ArrowLeftIcon />
              企画詳細に戻る
            </Link>
          </Button>
          <Heading as="h1" textStyle="2xl" fontWeight="bold">
            提出履歴
          </Heading>
        </div>

        <ProjectSubmissionsHistory
          slug={slug}
          eventId={event.id}
          orgId={cast<OrgId>(orgId)}
          projectId={cast<ProjectId>(projectId)}
        />
      </Stack>
    </Container>
  );
}
