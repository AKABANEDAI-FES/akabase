/**
 * Shared query layer utilities and exception handling
 */

/**
 * Query error codes
 */
export type QueryErrorCode = "DATABASE_ERROR" | "ACTOR_RESOLUTION_FAILED" | "VALIDATION_ERROR";

/**
 * Query exception class
 * Thrown when query operations fail due to infrastructure or unexpected errors
 */
export class QueryExceptionError extends Error {
  readonly code: QueryErrorCode;
  readonly cause?: unknown;

  constructor(code: QueryErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "QueryExceptionError";
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Place with the names from the root to itself
 * A place name alone is ambiguous because the same name is allowed under different parents
 */
export type PlaceWithPath = {
  id: string;
  name: string;
  path: string[];
};

type PlaceNode = { id: string; name: string; parentId: string | null };

type TagRow = { tag: { id: string; name: string; displayOrder: number; eventId: string } };

/**
 * Sort the tags of a project by display order
 * Tags are not constrained to the event of their project, so tags of other events are dropped
 */
export function toTagItems(tags: TagRow[], eventId: string): { id: string; name: string }[] {
  return tags
    .filter((row) => row.tag.eventId === eventId)
    .toSorted((a, b) => a.tag.displayOrder - b.tag.displayOrder)
    .map((row) => ({ id: row.tag.id, name: row.tag.name }));
}

/**
 * Resolve each place into itself and the names from the root to it
 *
 * @example
 * ```ts
 * const places = [
 *   { id: "building", name: "1号館", parentId: null },
 *   { id: "room", name: "101教室", parentId: "building" },
 * ];
 *
 * resolvePlacesWithPath(places).get("room");
 * // { id: "room", name: "101教室", path: ["1号館", "101教室"] }
 * ```
 */
export function resolvePlacesWithPath(places: PlaceNode[]): Map<string, PlaceWithPath> {
  const placeMap = new Map(places.map((place) => [place.id, place]));

  const resolvePath = (place: PlaceNode, visited: Set<string>): string[] => {
    const parent = place.parentId === null ? undefined : placeMap.get(place.parentId);
    if (parent === undefined || visited.has(parent.id)) {
      return [place.name];
    }
    return [...resolvePath(parent, new Set([...visited, parent.id])), place.name];
  };

  return new Map(
    places.map((place) => [
      place.id,
      { id: place.id, name: place.name, path: resolvePath(place, new Set([place.id])) },
    ]),
  );
}
