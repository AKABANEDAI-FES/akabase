import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { EventStatusBadge } from "@/features/event/components";
import { Button, Code, Heading, IconButton, Table } from "@/components/ui";
import { Container, Flex, Stack } from "styled-system/jsx";
import { PencilIcon, PlusIcon } from "lucide-react";
import { loadEventsFn } from "@/features/event/actions";

export const Route = createFileRoute("/admin/events")({
  loader: async () => {
    return {
      events: await loadEventsFn(),
    };
  },
  component: EventListPage,
});

function EventListPage() {
  const { events } = Route.useLoaderData();

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
                <Table.Header>アクション</Table.Header>
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
                  <Table.Cell>{new Date(event.createdAt).toLocaleDateString("ja-JP")}</Table.Cell>
                  <Table.Cell>
                    <IconButton size="sm" variant="plain" aria-label="編集" asChild>
                      <Link to="/admin/events/$eventId" params={{ eventId: event.id }}>
                        <PencilIcon />
                      </Link>
                    </IconButton>
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
