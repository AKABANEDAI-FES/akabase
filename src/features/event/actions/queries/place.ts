import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listPlaces } from "@/application/query/event/list-places";
import { authMiddleware } from "@/libs/session-server";
import { eventIdSchema } from "@/domain/shared/ids";
import { queryOptions } from "@tanstack/react-query";

/**
 * Server function to load places for an event
 */
export const loadPlacesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data }) => {
    return await listPlaces(data.eventId);
  });

/**
 * Generate cache key for places list
 */
export function generateLoadPlacesCacheKey(eventId: string) {
  return ["events", eventId, "places"];
}

/**
 * Generate query options for places list
 */
export function generateLoadPlacesQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadPlacesCacheKey(eventId),
    queryFn: () => loadPlacesFn({ data: { eventId } }),
  });
}
