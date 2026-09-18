import { stringify } from "@std/csv/stringify";
import { Fragment, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnFiltersState, FilterFn } from "@tanstack/react-table";
import { DownloadTrigger } from "@ark-ui/react/download-trigger";
import { Portal } from "@ark-ui/react/portal";
import { BracesIcon, ListFilterIcon, SheetIcon, TableIcon } from "lucide-react";
import { Box, Flex, Grid, Stack } from "@akabase/styled-system/jsx";
import { Button } from "@akabase/ui/components/button";
import { Checkbox } from "@akabase/ui/components/checkbox";
import { IconButton } from "@akabase/ui/components/icon-button";
import { Popover } from "@akabase/ui/components/popover";
import { Table } from "@akabase/ui/components/table";
import { Text } from "@akabase/ui/components/text";
import { generateLoadEventPublishedDataQueryOptions } from "../actions/queries";
import { generateLoadPlacesQueryOptions } from "@/features/event/actions/queries/place";
import type { EventPublishedDataItem } from "@akabase/application/query/project/list-event-published-data";
import type { PlaceListItem } from "@akabase/application/query/event/list-places";
import type { EventId } from "@akabase/domain/event/schema";
import { createImageObject, processImage } from "@/libs/image";
import { ExportSettingsPanel } from "./export-settings-panel";

// --- Place hierarchy helpers ---

type PlaceTreeNode = {
  id: string;
  name: string;
  children: PlaceTreeNode[];
};

function buildPlaceTree(places: PlaceListItem[]): PlaceTreeNode[] {
  const childrenMap = new Map<string | null, PlaceListItem[]>();
  for (const place of places) {
    if (!childrenMap.has(place.parentId)) {
      childrenMap.set(place.parentId, []);
    }
    childrenMap.get(place.parentId)?.push(place);
  }

  function buildNode(place: PlaceListItem): PlaceTreeNode {
    const nodeChildren = childrenMap.get(place.id) || [];
    return { id: place.id, name: place.name, children: nodeChildren.map(buildNode) };
  }

  const roots = childrenMap.get(null) || [];
  return roots.map(buildNode);
}

function getLeafNodeIds(node: PlaceTreeNode): string[] {
  if (node.children.length === 0) {
    return [node.id];
  }
  return node.children.flatMap(getLeafNodeIds);
}

// --- Column definitions ---

type ExportColumn = {
  id: string;
  header: string;
  text: (item: EventPublishedDataItem) => string;
  json?: (item: EventPublishedDataItem) => unknown;
  jsonKey?: string;
  cell?: (item: EventPublishedDataItem) => ReactNode;
  imageUrl?: (item: EventPublishedDataItem) => string | null;
};

const exportColumns: ExportColumn[] = [
  {
    id: "logoUrl",
    header: "ロゴ",
    text: (item) => item.logoUrl ?? "",
    cell: (item) =>
      item.logoUrl ? (
        <img src={item.logoUrl} alt="" width={256} height={256} style={{ objectFit: "contain" }} />
      ) : (
        "—"
      ),
    imageUrl: (item) => item.logoUrl,
  },
  { id: "projectName", header: "企画名", text: (item) => item.projectName },
  { id: "orgName", header: "出展団体名", text: (item) => item.orgName },
  {
    id: "categoryId",
    header: "企画区分",
    text: (item) => item.categoryName ?? "",
    json: (item) => item.categoryName,
    jsonKey: "categoryName",
  },
  {
    id: "pamphletText",
    header: "パンフレットテキスト",
    text: (item) => item.pamphletText,
    cell: (item) => <span style={{ whiteSpace: "pre-wrap" }}>{item.pamphletText}</span>,
  },
  { id: "openingHours", header: "開催時間", text: (item) => item.openingHours },
  {
    id: "placeId",
    header: "場所",
    text: (item) => item.placeName ?? "",
    json: (item) => item.placeName,
    jsonKey: "placeName",
  },
  {
    id: "tags",
    header: "タグ",
    text: (item) => item.tags.join(", "),
    json: (item) => item.tags,
  },
  {
    id: "contestVoteNumber",
    header: "投票番号",
    text: (item) => item.contestVoteNumber ?? "",
    json: (item) => item.contestVoteNumber,
  },
];

/** Order columns for exported files. Image columns go last */
function toFileColumns(columns: ExportColumn[]): ExportColumn[] {
  return [...columns.filter((col) => !col.imageUrl), ...columns.filter((col) => col.imageUrl)];
}

function jsonKeyOf(col: ExportColumn): string {
  return col.jsonKey ?? col.id;
}

function toAbsoluteUrl(path: string): string {
  return `${globalThis.window.location.origin}${path}`;
}

function imageFileUrlOf(col: ExportColumn, item: EventPublishedDataItem): string | null {
  const url = col.imageUrl?.(item);
  return url ? toAbsoluteUrl(url) : null;
}

function jsonValueOf(col: ExportColumn, item: EventPublishedDataItem): unknown {
  if (col.json) {
    return col.json(item);
  }
  return col.imageUrl ? imageFileUrlOf(col, item) : col.text(item);
}

function cellOf(col: ExportColumn, item: EventPublishedDataItem): ReactNode {
  return col.cell ? col.cell(item) : col.text(item) || "—";
}

const placeFilterFn: FilterFn<EventPublishedDataItem> = (row, _columnId, filterValue: string[]) => {
  const { placeId } = row.original;
  return placeId !== null && filterValue.includes(placeId);
};

const columnHelper = createColumnHelper<EventPublishedDataItem>();

const columns = exportColumns.map((col) =>
  columnHelper.accessor((item) => col.text(item), {
    id: col.id,
    header: col.header,
    cell: (info) => cellOf(col, info.row.original),
    ...(col.id === "placeId" ? { filterFn: placeFilterFn } : {}),
  }),
);

// --- CSV/JSON/Excel download helpers ---

async function fetchImageBuffer(url: string): Promise<Uint8Array | null> {
  try {
    const res = await createImageObject(url);
    let buffer = new ArrayBuffer();
    if (res.meta.type === "image/webp") {
      // Convert WebP to PNG for better compatibility in Excel
      const processed = await processImage(res, { compress: { format: "png", quality: 1 } });
      buffer = await processed.blob.arrayBuffer();
    } else {
      buffer = await res.blob.arrayBuffer();
    }
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

const IMAGE_SIZE_PX = 128;

// oxlint-disable-next-line max-statements
async function toExcel(data: EventPublishedDataItem[], columns: ExportColumn[]): Promise<Blob> {
  const {
    default: xlsxInit,
    Format,
    Workbook,
    Image: XlsxImage,
  } = await import("wasm-xlsxwriter/web");
  await xlsxInit();

  const fileColumns = toFileColumns(columns);
  const imageColumns = fileColumns.flatMap((col, index) =>
    col.imageUrl ? [{ index, imageUrl: col.imageUrl }] : [],
  );

  // Fetch all images in parallel
  const imageBuffers = await Promise.all(
    data.map((item) =>
      Promise.all(
        imageColumns.map(({ imageUrl }) => {
          const url = imageUrl(item);
          return url ? fetchImageBuffer(url) : Promise.resolve(null);
        }),
      ),
    ),
  );

  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet();
  const boldFormat = new Format().setBold();

  for (const [col, column] of fileColumns.entries()) {
    worksheet.writeWithFormat(0, col, column.header, boldFormat);
  }
  for (const { index } of imageColumns) {
    worksheet.setColumnWidthPixels(index, IMAGE_SIZE_PX + 8);
  }

  for (const [row, item] of data.entries()) {
    for (const [col, column] of fileColumns.entries()) {
      if (!column.imageUrl) {
        worksheet.write(row + 1, col, column.text(item));
      }
    }
    for (const [i, { index }] of imageColumns.entries()) {
      const buf = imageBuffers[row]?.[i];
      if (buf) {
        const image = new XlsxImage(buf).setScaleToSize(IMAGE_SIZE_PX, IMAGE_SIZE_PX, true);
        worksheet.setRowHeightPixels(row + 1, IMAGE_SIZE_PX + 4);
        worksheet.insertImageFitToCell(row + 1, index, image, true);
      }
    }
  }

  const resultBuf = workbook.saveToBufferSync();
  const array = new Uint8Array(resultBuf);
  return new Blob([array], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function csvHeaderOf(col: ExportColumn): string {
  return col.imageUrl ? `${col.header}URL` : col.header;
}

function csvValueOf(col: ExportColumn, item: EventPublishedDataItem): string {
  return col.imageUrl ? (imageFileUrlOf(col, item) ?? "") : col.text(item);
}

function toCSV(data: EventPublishedDataItem[], columns: ExportColumn[]): string {
  const fileColumns = toFileColumns(columns);
  return stringify(
    data.map((item) =>
      Object.fromEntries(fileColumns.map((col) => [csvHeaderOf(col), csvValueOf(col, item)])),
    ),
    { columns: fileColumns.map(csvHeaderOf) },
  );
}

function toJSON(data: EventPublishedDataItem[], columns: ExportColumn[]): string {
  const fileColumns = toFileColumns(columns);
  return JSON.stringify(
    data.map((item) =>
      Object.fromEntries(fileColumns.map((col) => [jsonKeyOf(col), jsonValueOf(col, item)])),
    ),
    null,
    2,
  );
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

type ExportDataTableProps = {
  eventId: EventId;
  slug: string;
};

export function ExportDataTable({ eventId, slug }: ExportDataTableProps) {
  const { data } = useSuspenseQuery(generateLoadEventPublishedDataQueryOptions(eventId));
  const { data: places } = useSuspenseQuery(generateLoadPlacesQueryOptions(eventId));

  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set());
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>(() =>
    exportColumns.map((col) => col.id),
  );

  const toggleNode = useCallback((allIds: string[]) => {
    setSelectedPlaceIds((prev) => {
      const next = new Set(prev);
      const allSelected = allIds.every((id) => next.has(id));
      if (allSelected) {
        for (const id of allIds) {
          next.delete(id);
        }
      } else {
        for (const id of allIds) {
          next.add(id);
        }
      }
      return next;
    });
  }, []);

  const columnFilters: ColumnFiltersState = useMemo(
    () => (selectedPlaceIds.size > 0 ? [{ id: "placeId", value: [...selectedPlaceIds] }] : []),
    [selectedPlaceIds],
  );

  // Keep the definition order regardless of the order the user checked them
  const selectedColumns = useMemo(
    () => exportColumns.filter((col) => selectedColumnIds.includes(col.id)),
    [selectedColumnIds],
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

  const canDownload = filteredData.length > 0 && selectedColumns.length > 0;

  return (
    <Grid
      gridTemplateColumns={{ base: "1fr", lg: "minmax(0, 1fr) 20rem" }}
      gap="6"
      alignItems="start"
    >
      <Stack gap="4">
        <Box overflowX="auto">
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
        </Box>

        <Text textStyle="sm" color="fg.muted">
          {selectedPlaceIds.size > 0
            ? `${filteredData.length} / ${data.length} 件の公開済みデータ（フィルタ中）`
            : `${data.length} 件の公開済みデータ`}
        </Text>
      </Stack>

      <ExportSettingsPanel
        columns={exportColumns}
        selectedIds={selectedColumnIds}
        onSelectedIdsChange={setSelectedColumnIds}
        summary={`${selectedColumns.length} / ${exportColumns.length} 列 · ${filteredData.length} 件`}
      >
        <DownloadTrigger
          data={() => toCSV(filteredData, selectedColumns)}
          fileName={`${slug}-published-data.csv`}
          mimeType="text/csv"
          asChild
        >
          <Button size="sm" variant="outline" disabled={!canDownload}>
            <TableIcon />
            CSV
          </Button>
        </DownloadTrigger>
        <DownloadTrigger
          data={() => toExcel(filteredData, selectedColumns)}
          fileName={`${slug}-published-data.xlsx`}
          mimeType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          asChild
        >
          <Button size="sm" variant="outline" disabled={!canDownload}>
            <SheetIcon />
            Excel
          </Button>
        </DownloadTrigger>
        <DownloadTrigger
          data={() => toJSON(filteredData, selectedColumns)}
          fileName={`${slug}-published-data.json`}
          mimeType="application/json"
          asChild
        >
          <Button size="sm" variant="outline" disabled={!canDownload}>
            <BracesIcon />
            JSON
          </Button>
        </DownloadTrigger>
      </ExportSettingsPanel>
    </Grid>
  );
}
