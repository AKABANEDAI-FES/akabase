import { Link, Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { generateLoadEventDetailQueryOptions } from "@/features/event/actions";
import { Button, Heading, SegmentGroup } from "@/components/ui";
import { Container, Stack } from "styled-system/jsx";
import { ArrowLeftIcon } from "lucide-react";

export const Route = createFileRoute("/admin/events_/$eventId")({
  loader: async ({ params, context }) =>
    context.queryClient.ensureQueryData(generateLoadEventDetailQueryOptions(params.eventId)),
  component: RouteComponent,
});

function RouteComponent() {
  const location = useLocation();
  const { eventId } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventDetailQueryOptions(eventId));

  const currentTab = location.pathname.endsWith("/users") ? "users" : "event";

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <div>
          <Button variant="plain" size="sm" mb="4" asChild>
            <Link to="/admin/events">
              <ArrowLeftIcon />
              イベント一覧に戻る
            </Link>
          </Button>
          <Stack gap="2">
            <Heading as="h1" textStyle="2xl" fontWeight="bold">
              {event.name}
            </Heading>
          </Stack>
        </div>

        <SegmentGroup.Root value={currentTab} variant="line">
          <SegmentGroup.Indicator />
          <SegmentGroup.Item value="event" asChild>
            <Link to="/admin/events/$eventId" params={{ eventId }}>
              <SegmentGroup.ItemText>基本情報</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </Link>
          </SegmentGroup.Item>
          <SegmentGroup.Item value="users" asChild>
            <Link to="/admin/events/$eventId/users" params={{ eventId }}>
              <SegmentGroup.ItemText>委員会メンバー</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </Link>
          </SegmentGroup.Item>
        </SegmentGroup.Root>

        <Outlet />
      </Stack>
    </Container>
  );
}
