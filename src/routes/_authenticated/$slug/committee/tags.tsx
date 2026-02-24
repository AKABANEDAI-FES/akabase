import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Heading } from "@/components/ui";
import { Container, Stack } from "styled-system/jsx";
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
        <Heading as="h1" textStyle="2xl" fontWeight="bold">
          タグ管理 - {event.name}
        </Heading>

        <TagManagementTable tags={tags} eventId={event.id} />
      </Stack>
    </Container>
  );
}
