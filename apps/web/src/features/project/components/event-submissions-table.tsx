import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { Portal } from "@ark-ui/react/portal";
import { ChevronLeftIcon, ChevronRightIcon, ListFilterIcon } from "lucide-react";
import { Button, ButtonGroup } from "@akabase/ui/components/button";
import { Checkbox } from "@akabase/ui/components/checkbox";
import { IconButton } from "@akabase/ui/components/icon-button";
import { Pagination } from "@akabase/ui/components/pagination";
import { Popover } from "@akabase/ui/components/popover";
import { Table } from "@akabase/ui/components/table";
import { Text } from "@akabase/ui/components/text";
import { Flex, Stack } from "@akabase/styled-system/jsx";
import { SubmissionStatusBadge } from "./submission-status-badge";
import { generateLoadEventSubmissionsQueryOptions } from "../actions/queries";
import type { EventSubmissionListItem } from "@akabase/application/query/project/list-event-submissions";
import type { SubmissionStatus } from "@akabase/domain/project/schema";
import type { EventId } from "@akabase/domain/event/schema";
import { FormatDate } from "@/libs/date";

const PAGE_SIZE = 10;

const statusOptions: SubmissionStatus[] = ["submitted", "approved", "returned", "withdrawn"];

const columnHelper = createColumnHelper<EventSubmissionListItem>();

const createColumns = (slug: string) => [
  columnHelper.accessor("orgName", {
    header: "出展団体名",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("projectName", {
    header: "企画名",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("submittedAt", {
    header: "提出日時",
    cell: (info) => (
      <FormatDate
        value={info.getValue()}
        option={{
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }}
      />
    ),
  }),
  columnHelper.accessor("submittedBy", {
    header: "提出者",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("status", {
    header: "ステータス",
    cell: (info) => <SubmissionStatusBadge status={info.getValue()} />,
    filterFn: "arrIncludesSome",
  }),
  columnHelper.display({
    id: "actions",
    header: "",
    cell: (info) => {
      const row = info.row.original;
      return (
        <Button variant="plain" size="sm" asChild>
          <Link
            to="/$slug/committee/submissions/$submissionId"
            params={{
              slug,
              submissionId: row.id,
            }}
          >
            詳細
          </Link>
        </Button>
      );
    },
  }),
];

type EventSubmissionsTableProps = {
  eventId: EventId;
  slug: string;
  status?: SubmissionStatus[];
  page?: number;
  onSearchChange: (updates: { status?: SubmissionStatus[]; page?: number }) => void;
};

export function EventSubmissionsTable({
  eventId,
  slug,
  status,
  page,
  onSearchChange,
}: EventSubmissionsTableProps) {
  const { data: submissions } = useSuspenseQuery(generateLoadEventSubmissionsQueryOptions(eventId));
  const columns = useMemo(() => createColumns(slug), [slug]);

  const columnFilters: ColumnFiltersState = useMemo(
    () => (status ? [{ id: "status", value: status }] : []),
    [status],
  );

  const pageIndex = (page ?? 1) - 1;

  const table = useReactTable({
    data: submissions,
    columns,
    state: {
      columnFilters,
      pagination: { pageIndex, pageSize: PAGE_SIZE },
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (submissions.length === 0) {
    return <Text>まだ提出がありません。</Text>;
  }

  const selectedStatuses = status ?? statusOptions;

  const toggleStatus = (s: SubmissionStatus) => {
    const isCurrentlySelected = selectedStatuses.includes(s);
    const next = isCurrentlySelected
      ? selectedStatuses.filter((x: SubmissionStatus) => x !== s)
      : [...selectedStatuses, s];

    onSearchChange({
      status: next.length === statusOptions.length ? undefined : next,
      page: undefined,
    });
  };

  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();

  return (
    <Stack gap="4">
      <Table.Root>
        <Table.Head>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Table.Header key={header.id}>
                  {header.isPlaceholder ? null : header.column.id === "status" ? (
                    <Flex align="center" gap="1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <StatusFilterPopover
                        selectedStatuses={selectedStatuses}
                        onToggle={toggleStatus}
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
                <Table.Cell
                  key={cell.id}
                  fontWeight={cell.column.id === "orgName" ? "medium" : undefined}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      {pageCount > 1 && (
        <Pagination.Root
          count={filteredCount}
          pageSize={PAGE_SIZE}
          // @ts-ignore - cssじゃないよ
          page={pageIndex + 1}
          ml="auto"
        >
          <ButtonGroup variant="outline" size="sm">
            <Pagination.PrevTrigger asChild>
              <IconButton colorPalette="gray">
                <ChevronLeftIcon />
              </IconButton>
            </Pagination.PrevTrigger>
            <Pagination.Items
              render={(page) =>
                page.selected ? (
                  <IconButton variant="solid" asChild>
                    <Link
                      to="/$slug/committee/submissions"
                      params={{ slug }}
                      search={{
                        page: page.value === 1 ? undefined : page.value,
                        status: status ?? undefined,
                      }}
                    >
                      {page.value}
                    </Link>
                  </IconButton>
                ) : (
                  <IconButton variant="outline" colorPalette="gray" asChild>
                    <Link
                      to="/$slug/committee/submissions"
                      params={{ slug }}
                      search={{
                        page: page.value === 1 ? undefined : page.value,
                        status: status ?? undefined,
                      }}
                    >
                      {page.value}
                    </Link>
                  </IconButton>
                )
              }
            />
            <Pagination.NextTrigger asChild>
              <IconButton colorPalette="gray">
                <ChevronRightIcon />
              </IconButton>
            </Pagination.NextTrigger>
          </ButtonGroup>
        </Pagination.Root>
      )}
    </Stack>
  );
}

function StatusFilterPopover({
  selectedStatuses,
  onToggle,
}: {
  selectedStatuses: SubmissionStatus[];
  onToggle: (status: SubmissionStatus) => void;
}) {
  const isFiltering = selectedStatuses.length < statusOptions.length;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton
          variant={isFiltering ? "subtle" : "plain"}
          size="2xs"
          aria-label="ステータスでフィルタ"
        >
          <ListFilterIcon />
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content w="fit-content">
            <Popover.Body>
              <Stack gap="2">
                {statusOptions.map((option) => (
                  <Checkbox.Root
                    key={option}
                    checked={selectedStatuses.includes(option)}
                    onCheckedChange={() => onToggle(option)}
                    size="sm"
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Label>
                      <SubmissionStatusBadge status={option} />
                    </Checkbox.Label>
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
