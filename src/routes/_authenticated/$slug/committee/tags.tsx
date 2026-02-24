import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button, Heading } from "@/components/ui";
import { Container, Flex, Stack } from "styled-system/jsx";
import { PlusIcon } from "lucide-react";
import {
  generateLoadEventBySlugQueryOptions,
  generateLoadTagsQueryOptions,
} from "@/features/event/actions/queries";
import { generateCheckIsCommitteeAdminQueryOptions } from "@/features/authorization/actions";
import { TagManagementTable } from "@/features/event/components/tag-management-table";

export const Route = createFileRoute("/_authenticated/$slug/committee/tags")({
  loader: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadTagsQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateCheckIsCommitteeAdminQueryOptions(event.id)),
    ]);
  },
  component: TagsManagementPage,
});

function TagsManagementPage() {
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));
  const { data: tags } = useSuspenseQuery(generateLoadTagsQueryOptions(event.id));

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <Flex justify="space-between" align="center">
          <Heading as="h1" textStyle="2xl" fontWeight="bold">
            タグ管理
          </Heading>
          <Button asChild>
            <Link to="/$slug/committee/tags/new" params={{ slug }}>
              <PlusIcon />
              タグを追加
            </Link>
          </Button>
        </Flex>

        <TagManagementTable tags={tags} eventId={event.id} />
      </Stack>
      <Outlet />
    </Container>
  );
}
