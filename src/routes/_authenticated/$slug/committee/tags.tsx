import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button, Heading } from "@/components/ui";
import { Container, Flex, Stack } from "styled-system/jsx";
import { PlusIcon } from "lucide-react";
import { generateLoadTagsQueryOptions } from "@/features/event/actions/queries";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions";
import { TagManagementTable } from "@/features/event/components/tag-management-table";

export const Route = createFileRoute("/_authenticated/$slug/committee/tags")({
  loader: async ({ context }) => {
    const event = context.activeEvent;
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadTagsQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateCheckCommitteePermissionsQueryOptions(event.id)),
    ]);
  },
  component: TagsManagementPage,
});

function TagsManagementPage() {
  const { slug } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();
  const { data: tags } = useSuspenseQuery(generateLoadTagsQueryOptions(event.id));
  const { data: permissions } = useSuspenseQuery(
    generateCheckCommitteePermissionsQueryOptions(event.id),
  );

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <Flex justify="space-between" align="center">
          <Heading as="h1" textStyle="2xl" fontWeight="bold">
            タグ管理
          </Heading>
          {permissions.canManageTags && (
            <Button asChild>
              <Link to="/$slug/committee/tags/new" params={{ slug }}>
                <PlusIcon />
                タグを追加
              </Link>
            </Button>
          )}
        </Flex>

        <TagManagementTable
          tags={tags}
          eventId={event.id}
          canUpdate={permissions.canManageTags}
          canDelete={permissions.canManageTags}
        />
      </Stack>
      <Outlet />
    </Container>
  );
}
