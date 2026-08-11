import { useCallback, useState } from "react";
import { Checkbox } from "@akabase/ui/components/checkbox";
import { Code } from "@akabase/ui/components/code";
import { IconButton } from "@akabase/ui/components/icon-button";
import { Popover } from "@akabase/ui/components/popover";
import { Table } from "@akabase/ui/components/table";
import { Text } from "@akabase/ui/components/text";
import { Portal } from "@ark-ui/react/portal";
import { Flex, Stack } from "@akabase/styled-system/jsx";
import { ListFilterIcon, Trash2Icon } from "lucide-react";
import type { ApiKeyListItem } from "@akabase/application/query/api-key/list-api-keys";
import type { EventListItem } from "@akabase/application/query/event/list-events";
import { DeleteApiKeyDialog } from "./delete-api-key-dialog";
import { FormatDate } from "@/libs/date";

type ApiKeysTableProps = {
  apiKeys: ApiKeyListItem[];
  events: EventListItem[];
};

function EventFilterPopover({
  events,
  selectedEventIds,
  onToggle,
}: {
  events: EventListItem[];
  selectedEventIds: Set<string>;
  onToggle: (eventId: string) => void;
}) {
  const isFiltering = selectedEventIds.size > 0;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton
          variant={isFiltering ? "subtle" : "plain"}
          size="2xs"
          aria-label={
            isFiltering
              ? `イベントでフィルタ（${selectedEventIds.size}件選択中）`
              : "イベントでフィルタ"
          }
        >
          <ListFilterIcon />
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content w="fit-content" maxH="xs" overflowY="auto">
            <Popover.Body>
              <Stack gap="2">
                {events.map((event) => (
                  <Checkbox.Root
                    key={event.id}
                    checked={selectedEventIds.has(event.id)}
                    onCheckedChange={() => onToggle(event.id)}
                    size="sm"
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Label>{event.name}</Checkbox.Label>
                  </Checkbox.Root>
                ))}
              </Stack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}

export function ApiKeysTable({ apiKeys, events }: ApiKeysTableProps) {
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());

  const toggleEvent = useCallback((eventId: string) => {
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  }, []);

  const filteredApiKeys =
    selectedEventIds.size === 0
      ? apiKeys
      : apiKeys.filter((apiKey) => apiKey.event !== null && selectedEventIds.has(apiKey.event.id));

  return (
    <Stack gap="4">
      <Table.Root>
        <Table.Head>
          <Table.Row>
            <Table.Header>名前</Table.Header>
            <Table.Header>
              <Flex align="center" gap="1">
                対象イベント
                <EventFilterPopover
                  events={events}
                  selectedEventIds={selectedEventIds}
                  onToggle={toggleEvent}
                />
              </Flex>
            </Table.Header>
            <Table.Header>キーの先頭</Table.Header>
            <Table.Header>作成者</Table.Header>
            <Table.Header>作成日</Table.Header>
            <Table.Header>操作</Table.Header>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {filteredApiKeys.map((apiKey) => (
            <Table.Row key={apiKey.id}>
              <Table.Cell>{apiKey.name ?? "-"}</Table.Cell>
              <Table.Cell>{apiKey.event === null ? "-" : apiKey.event.name}</Table.Cell>
              <Table.Cell>
                {apiKey.start === null ? "-" : <Code size="sm">{apiKey.start}…</Code>}
              </Table.Cell>
              <Table.Cell>{apiKey.createdBy.name}</Table.Cell>
              <Table.Cell>
                <FormatDate value={apiKey.createdAt} option={{ dateStyle: "medium" }} />
              </Table.Cell>
              <Table.Cell>
                <DeleteApiKeyDialog apiKey={apiKey}>
                  <IconButton
                    aria-label={`「${apiKey.name ?? "名前未設定"}」を削除`}
                    variant="plain"
                    size="sm"
                    colorPalette="red"
                  >
                    <Trash2Icon />
                  </IconButton>
                </DeleteApiKeyDialog>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <Text textStyle="sm" color="fg.muted">
        {selectedEventIds.size > 0
          ? `${filteredApiKeys.length} / ${apiKeys.length} 件のAPIキー（フィルタ中）`
          : `${apiKeys.length} 件のAPIキー`}
      </Text>
    </Stack>
  );
}
