import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { IconButton } from "@archive/ui/components/icon-button";
import { Table } from "@archive/ui/components/table";
import { Flex } from "@archive/styled-system/jsx";
import { PencilIcon, Trash2Icon } from "lucide-react";
import type { EventId } from "@archive/domain/event/schema";
import type { PlaceListItem } from "@archive/application/query/event/list-places";
import { DeletePlaceDialog } from "./delete-place-dialog";
import { FormatDate } from "@/libs/date";

type PlaceManagementTableProps = {
  places: PlaceListItem[];
  eventId: EventId;
  slug: string;
  canUpdate?: boolean;
  canDelete?: boolean;
};

/**
 * Build hierarchical structure for display
 */
function buildPlaceHierarchy(places: PlaceListItem[]) {
  const children = new Map<string | null, PlaceListItem[]>();

  // Group by parent
  for (const place of places) {
    const { parentId } = place;
    if (!children.has(parentId)) {
      children.set(parentId, []);
    }
    children.get(parentId)?.push(place);
  }

  // Get root places (no parent)
  const rootPlaces = children.get(null) || [];

  // Flatten with depth
  const result: (PlaceListItem & { depth: number })[] = [];

  function traverse(place: PlaceListItem, depth: number) {
    result.push({ ...place, depth });
    const childPlaces = children.get(place.id) || [];
    for (const child of childPlaces) {
      traverse(child, depth + 1);
    }
  }

  for (const root of rootPlaces) {
    traverse(root, 0);
  }

  return result;
}

/**
 * Place management table component with CRUD operations
 */
export function PlaceManagementTable({
  places,
  eventId,
  slug,
  canUpdate,
  canDelete,
}: PlaceManagementTableProps) {
  const hierarchicalPlaces = useMemo(() => buildPlaceHierarchy(places), [places]);
  const showActions = canUpdate || canDelete;

  return (
    <>
      {places.length === 0 ? (
        <p>場所がまだありません。新しい場所を追加してください。</p>
      ) : (
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>場所名</Table.Header>
              <Table.Header>作成日</Table.Header>
              {showActions && <Table.Header>操作</Table.Header>}
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {hierarchicalPlaces.map((place) => (
              <Table.Row key={place.id}>
                <Table.Cell fontWeight="medium">
                  <span style={{ paddingLeft: `${place.depth * 24}px` }}>{place.name}</span>
                </Table.Cell>
                <Table.Cell>
                  <FormatDate value={place.createdAt} option={{ dateStyle: "medium" }} />
                </Table.Cell>
                {showActions && (
                  <Table.Cell>
                    <Flex gap="2">
                      {canUpdate && (
                        <IconButton aria-label="編集" variant="plain" size="sm" asChild>
                          <Link
                            to="/$slug/committee/places/$placeId/edit"
                            params={{ slug, placeId: place.id }}
                          >
                            <PencilIcon />
                          </Link>
                        </IconButton>
                      )}
                      {canDelete && (
                        <DeletePlaceDialog eventId={eventId} place={place}>
                          <IconButton
                            aria-label="削除"
                            variant="plain"
                            size="sm"
                            colorPalette="red"
                          >
                            <Trash2Icon />
                          </IconButton>
                        </DeletePlaceDialog>
                      )}
                    </Flex>
                  </Table.Cell>
                )}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </>
  );
}
