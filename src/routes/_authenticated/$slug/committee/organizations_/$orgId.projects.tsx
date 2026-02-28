import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button, IconButton, Table } from "@/components/ui";
import { Flex, Stack } from "styled-system/jsx";
import { PencilIcon, PlusIcon } from "lucide-react";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions";
import { generateLoadProjectsQueryOptions } from "@/features/project/actions";
import { cast } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions";
import { FormatDate } from "@/libs/date";

export const Route = createFileRoute(
  "/_authenticated/$slug/committee/organizations_/$orgId/projects",
)({
  loader: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadProjectsQueryOptions(event.id, params.orgId)),
      context.queryClient.ensureQueryData(generateCheckCommitteePermissionsQueryOptions(event.id)),
    ]);
  },
  component: ProjectsPage,
});

function ProjectsPage() {
  const { slug, orgId } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));
  const { data: projects } = useSuspenseQuery(generateLoadProjectsQueryOptions(event.id, orgId));
  const { data: permissions } = useSuspenseQuery(
    generateCheckCommitteePermissionsQueryOptions(event.id),
  );

  const canUpdate = permissions.canUpdateProject;

  return (
    <Stack gap="6">
      <Flex justify="flex-end">
        <AddProjectButton slug={slug} eventId={cast<EventId>(event.id)} orgId={orgId} />
      </Flex>

      {projects.length === 0 ? (
        <p>企画がまだありません。新しい企画を作成してください。</p>
      ) : (
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>企画名</Table.Header>
              <Table.Header>開催場所</Table.Header>
              <Table.Header>作成日</Table.Header>
              {canUpdate && <Table.Header>操作</Table.Header>}
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {projects.map((project) => (
              <Table.Row key={project.id}>
                <Table.Cell fontWeight="medium">{project.name}</Table.Cell>
                <Table.Cell>{project.placeName || "—"}</Table.Cell>
                <Table.Cell>
                  <FormatDate value={project.createdAt} option={{ dateStyle: "medium" }} />
                </Table.Cell>
                {canUpdate && (
                  <Table.Cell>
                    <Flex gap="2">
                      <IconButton aria-label="編集" variant="plain" size="sm" asChild>
                        <Link
                          to="/$slug/committee/organizations/$orgId/projects/$projectId"
                          params={{ slug, orgId, projectId: project.id }}
                        >
                          <PencilIcon />
                        </Link>
                      </IconButton>
                    </Flex>
                  </Table.Cell>
                )}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
      <Outlet />
    </Stack>
  );
}

type AddProjectButtonProps = {
  slug: string;
  eventId: EventId;
  orgId: string;
};

function AddProjectButton({ slug, eventId, orgId }: AddProjectButtonProps) {
  const { data: permissions } = useSuspenseQuery(
    generateCheckCommitteePermissionsQueryOptions(eventId),
  );

  if (!permissions.canCreateProject) {
    return null;
  }

  return (
    <Link to="/$slug/committee/organizations/$orgId/projects/new" params={{ slug, orgId }}>
      <Button>
        <PlusIcon />
        企画を作成
      </Button>
    </Link>
  );
}
