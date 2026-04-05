import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { EventStatusBadge } from "@/features/event/components/event-status-badge";
import { Button } from "@akabase/ui/components/button";
import { Code } from "@akabase/ui/components/code";
import { Heading } from "@akabase/ui/components/heading";
import { Table } from "@akabase/ui/components/table";
import { Container, Flex, Stack } from "@akabase/styled-system/jsx";
import { PencilIcon, PlusIcon } from "lucide-react";
import { generateLoadEventsQueryOptions } from "@/features/event/actions/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FormatDate } from "@/libs/date";

export const Route = createFileRoute("/_authenticated/admin/events")({
  loader: async ({ context }) =>
    context.queryClient.ensureQueryData(generateLoadEventsQueryOptions()),
  component: EventListPage,
});

function EventListPage() {
  const { data: events } = useSuspenseQuery(generateLoadEventsQueryOptions());

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <Flex justify="space-between" align="center">
          <Heading as="h1" textStyle="2xl" fontWeight="bold">
            イベント一覧
          </Heading>
          <Link to="/admin/events/new">
            <Button>
              <PlusIcon />
              イベントを作成
            </Button>
          </Link>
        </Flex>

        {events.length === 0 ? (
          <p>イベントがまだありません。新しいイベントを作成してください。</p>
        ) : (
          <Table.Root>
            <Table.Head>
              <Table.Row>
                <Table.Header>名前</Table.Header>
                <Table.Header>スラッグ</Table.Header>
                <Table.Header>ステータス</Table.Header>
                <Table.Header>作成日</Table.Header>
                <Table.Header>操作</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {events.map((event) => (
                <Table.Row key={event.id}>
                  <Table.Cell>{event.name}</Table.Cell>
                  <Table.Cell>
                    <Code>{event.slug}</Code>
                  </Table.Cell>
                  <Table.Cell>
                    <EventStatusBadge status={event.status} />
                  </Table.Cell>
                  <Table.Cell>
                    <FormatDate value={event.createdAt} option={{ dateStyle: "medium" }} />
                  </Table.Cell>
                  <Table.Cell>
                    <Button size="sm" variant="plain" asChild>
                      <Link to="/admin/events/$eventId" params={{ eventId: event.id }}>
                        <PencilIcon />
                        編集
                      </Link>
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Stack>
      <Outlet />
    </Container>
  );
}
