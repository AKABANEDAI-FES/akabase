import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Result } from "@praha/byethrow";
import { listEvents } from "@/application/query/event/list-events";
import type { EventListItem } from "@/application/query/event/list-events";
import { Badge, Button, Code, Table } from "@/components/ui";
import { css } from "styled-system/css";
import { Flex, Stack } from "styled-system/jsx";
import { PlusIcon } from "lucide-react";

/**
 * Server function to load all events
 */
const loadEventsFn = createServerFn({ method: "GET" }).handler(async () => {
  const result = await listEvents();

  if (Result.isFailure(result)) {
    throw new Error(result.error.message);
  }

  return result.value;
});

/**
 * Admin events list route
 */
export const Route = createFileRoute("/admin/events")({
  loader: async () => {
    return {
      events: await loadEventsFn(),
    };
  },
  component: EventListPage,
});

/**
 * Event list page component
 */
function EventListPage() {
  const { events } = Route.useLoaderData();

  return (
    <div className={css({ padding: "8", maxWidth: "1200px", margin: "0 auto" })}>
      <Stack gap="6">
        {/* Header */}
        <Flex justify="space-between" align="center">
          <h1 className={css({ fontSize: "2xl", fontWeight: "bold" })}>イベント一覧</h1>
          <Link to="/admin/events/new">
            <Button>
              <PlusIcon />
              イベントを作成
            </Button>
          </Link>
        </Flex>

        {/* Events table */}
        {events.length === 0 ? (
          <div className={css({ padding: "8", textAlign: "center", color: "gray.500" })}>
            イベントがまだありません。新しいイベントを作成してください。
          </div>
        ) : (
          <Table.Root>
            <Table.Head>
              <Table.Row>
                <Table.Header>名前</Table.Header>
                <Table.Header>スラッグ</Table.Header>
                <Table.Header>ステータス</Table.Header>
                <Table.Header>作成日</Table.Header>
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
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Stack>
      <Outlet />
    </div>
  );
}

/**
 * Event status badge component
 */
function EventStatusBadge({ status }: { status: EventListItem["status"] }) {
  if (status === "active") {
    return <Badge variant="solid">Active</Badge>;
  }

  return <Badge variant="subtle">Archived</Badge>;
}
