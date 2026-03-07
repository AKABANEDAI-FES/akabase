import { Fragment, useCallback, useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { DownloadTrigger } from "@ark-ui/react/download-trigger";
import { Portal } from "@ark-ui/react/portal";
import { DownloadIcon, ListFilterIcon } from "lucide-react";
import { Flex, Stack } from "styled-system/jsx";
import { Button, Checkbox, IconButton, Popover, Table, Text } from "@/components/ui";
import { generateLoadEventPublishedDataQueryOptions } from "@/features/project/actions/queries";
import { generateLoadPlacesQueryOptions } from "@/features/event/actions/queries/place";
import type { EventPublishedDataItem } from "@/application/query/project/list-event-published-data";
import type { PlaceListItem } from "@/application/query/event/list-places";
import type { EventId } from "@/domain/shared/ids";

// --- Place hierarchy helpers ---

interface PlaceTreeNode {
  id: string;
  name: string;
  children: PlaceTreeNode[];
}

function buildPlaceTree(places: PlaceListItem[]): PlaceTreeNode[] {
  const childrenMap = new Map<string | null, PlaceListItem[]>();
  for (const place of places) {
    if (!childrenMap.has(place.parentId)) {
      childrenMap.set(place.parentId, []);
    }
    childrenMap.get(place.parentId)!.push(place);
  }

  function buildNode(place: PlaceListItem): PlaceTreeNode {
    const nodeChildren = childrenMap.get(place.id) || [];
    return { id: place.id, name: place.name, children: nodeChildren.map(buildNode) };
  }

  const roots = childrenMap.get(null) || [];
  return roots.map(buildNode);
}

function getLeafNodeIds(node: PlaceTreeNode): string[] {
  if (node.children.length === 0) return [node.id];
  return node.children.flatMap(getLeafNodeIds);
}

// --- Column definitions ---

const columnHelper = createColumnHelper<EventPublishedDataItem>();

const columns = [
  columnHelper.accessor("projectName", {
    header: "企画名",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("orgName", {
    header: "出展団体名",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("pamphletText", {
    header: "パンフレットテキスト",
    cell: (info) => <span style={{ whiteSpace: "pre-wrap" }}>{info.getValue()}</span>,
  }),
  columnHelper.accessor("placeId", {
    id: "placeId",
    header: "場所",
    cell: (info) => info.row.original.placeName ?? "—",
    filterFn: (row, _columnId, filterValue: string[]) => {
      const placeId = row.getValue<string | null>("placeId");
      if (!placeId) return false;
      return filterValue.includes(placeId);
    },
  }),
  columnHelper.accessor("tags", {
    header: "タグ",
    cell: (info) => info.getValue().join(", ") || "—",
  }),
];

// --- CSV/JSON download helpers ---

function escapeCSVField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCSV(data: EventPublishedDataItem[]): string {
  const header = ["企画名", "出展団体名", "パンフレットテキスト", "場所", "タグ"];
  const rows = data.map((item) => [
    escapeCSVField(item.projectName),
    escapeCSVField(item.orgName),
    escapeCSVField(item.pamphletText),
    escapeCSVField(item.placeName ?? ""),
    escapeCSVField(item.tags.join(", ")),
  ]);
  return [header.map(escapeCSVField).join(","), ...rows.map((r) => r.join(","))].join("\n");
}

// --- Place filter popover ---

function PlaceCheckboxGroup({
  nodes,
  selectedPlaceIds,
  onToggleNode,
}: {
  nodes: PlaceTreeNode[];
  selectedPlaceIds: Set<string>;
  onToggleNode: (allIds: string[]) => void;
}) {
  const content = nodes.map((node) => {
    const allIds = getLeafNodeIds(node);
    const allChecked = allIds.every((id) => selectedPlaceIds.has(id));
    const someChecked = allIds.some((id) => selectedPlaceIds.has(id));
    const indeterminate = someChecked && !allChecked;

    return (
      <Fragment key={node.id}>
        <Checkbox.Root
          checked={indeterminate ? "indeterminate" : allChecked}
          onCheckedChange={() => onToggleNode(allIds)}
          size="sm"
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>{node.name}</Checkbox.Label>
        </Checkbox.Root>
        {node.children.length > 0 && (
          <PlaceCheckboxGroup
            nodes={node.children}
            selectedPlaceIds={selectedPlaceIds}
            onToggleNode={onToggleNode}
          />
        )}
      </Fragment>
    );
  });

  return (
    <Stack gap="2" css={{ "& > &": { ms: "6" } }}>
      {content}
    </Stack>
  );
}

function PlaceFilterPopover({
  places,
  selectedPlaceIds,
  onToggleNode,
}: {
  places: PlaceListItem[];
  selectedPlaceIds: Set<string>;
  onToggleNode: (allIds: string[]) => void;
}) {
  const tree = useMemo(() => buildPlaceTree(places), [places]);
  const isFiltering = selectedPlaceIds.size > 0;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton
          variant={isFiltering ? "subtle" : "plain"}
          size="2xs"
          aria-label="場所でフィルタ"
        >
          <ListFilterIcon />
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content w="fit-content" maxH="xs" overflowY="auto">
            <Popover.Body>
              <Stack gap="2">
                <PlaceCheckboxGroup
                  nodes={tree}
                  selectedPlaceIds={selectedPlaceIds}
                  onToggleNode={onToggleNode}
                />
              </Stack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}

// --- Main component ---

interface ExportDataTableProps {
  eventId: EventId;
  slug: string;
}

export function ExportDataTable({ eventId, slug }: ExportDataTableProps) {
  const { data } = useSuspenseQuery(generateLoadEventPublishedDataQueryOptions(eventId));
  const { data: places } = useSuspenseQuery(generateLoadPlacesQueryOptions(eventId));

  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set());

  const toggleNode = useCallback((allIds: string[]) => {
    setSelectedPlaceIds((prev) => {
      const next = new Set(prev);
      const allSelected = allIds.every((id) => next.has(id));
      if (allSelected) {
        for (const id of allIds) next.delete(id);
      } else {
        for (const id of allIds) next.add(id);
      }
      return next;
    });
  }, []);

  const columnFilters: ColumnFiltersState = useMemo(
    () => (selectedPlaceIds.size > 0 ? [{ id: "placeId", value: [...selectedPlaceIds] }] : []),
    [selectedPlaceIds],
  );

  const table = useReactTable({
    data,
    columns,
    state: { columnFilters },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const filteredData = table.getFilteredRowModel().rows.map((row) => row.original);

  if (data.length === 0) {
    return <Text>公開済みのデータがありません。</Text>;
  }

  return (
    <Stack gap="4">
      <Flex justify="flex-end" gap="2">
        <DownloadTrigger
          data={() => toCSV(filteredData)}
          fileName={`${slug}-published-data.csv`}
          mimeType="text/csv"
          asChild
        >
          <Button size="sm" variant="outline" disabled={filteredData.length === 0}>
            <DownloadIcon />
            CSV
          </Button>
        </DownloadTrigger>
        <DownloadTrigger
          data={() =>
            JSON.stringify(
              filteredData.map(({ projectName, orgName, pamphletText, placeName, tags }) => ({
                projectName,
                orgName,
                pamphletText,
                placeName,
                tags,
              })),
              null,
              2,
            )
          }
          fileName={`${slug}-published-data.json`}
          mimeType="application/json"
          asChild
        >
          <Button size="sm" variant="outline" disabled={filteredData.length === 0}>
            <DownloadIcon />
            JSON
          </Button>
        </DownloadTrigger>
      </Flex>

      <Table.Root>
        <Table.Head>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Table.Header key={header.id}>
                  {header.isPlaceholder ? null : header.column.id === "placeId" ? (
                    <Flex align="center" gap="1">
                      場所
                      <PlaceFilterPopover
                        places={places}
                        selectedPlaceIds={selectedPlaceIds}
                        onToggleNode={toggleNode}
                      />
                    </Flex>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </Table.Header>
              ))}
            </Table.Row>
          ))}
        </Table.Head>
        <Table.Body>
          {table.getRowModel().rows.map((row) => (
            <Table.Row key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <Table.Cell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <Text textStyle="sm" color="fg.muted">
        {selectedPlaceIds.size > 0
          ? `${filteredData.length} / ${data.length} 件の公開済みデータ（フィルタ中）`
          : `${data.length} 件の公開済みデータ`}
      </Text>
    </Stack>
  );
}
