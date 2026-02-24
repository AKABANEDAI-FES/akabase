import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button, Table } from "@/components/ui";
import { Flex, Stack } from "styled-system/jsx";
import { PlusIcon } from "lucide-react";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions";
import { generateLoadProjectsQueryOptions } from "@/features/project/actions";
import { cast } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";
import { generateCheckIsCommitteeAdminQueryOptions } from "@/features/authorization/actions";

export const Route = createFileRoute(
  "/_authenticated/$slug/committee/organizations_/$orgId/projects",
)({
  loader: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadProjectsQueryOptions(params.orgId)),
      context.queryClient.ensureQueryData(generateCheckIsCommitteeAdminQueryOptions(event.id)),
    ]);
  },
  component: ProjectsPage,
});

function ProjectsPage() {
  const { slug, orgId } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));
  const { data: projects } = useSuspenseQuery(generateLoadProjectsQueryOptions(orgId));

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
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {projects.map((project) => (
              <Table.Row key={project.id}>
                <Table.Cell fontWeight="medium">{project.name}</Table.Cell>
                <Table.Cell>{project.placeText || "—"}</Table.Cell>
                <Table.Cell>{new Date(project.createdAt).toLocaleDateString("ja-JP")}</Table.Cell>
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
  const { data: authCheck } = useSuspenseQuery(generateCheckIsCommitteeAdminQueryOptions(eventId));

  if (!authCheck.isCommitteeAdmin) {
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
