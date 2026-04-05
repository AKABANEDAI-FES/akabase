import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listPlaces } from "@akabase/application/query/event/list-places";
import { authMiddleware } from "@/libs/auth";
import { eventIdSchema } from "@akabase/domain/event/schema";
import { queryOptions } from "@tanstack/react-query";
import { dependenciesMiddleware } from "@/libs/dependencies";

/**
 * Server function to load places for an event
 */
export const loadPlacesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    return await listPlaces(context.dependencies, data.eventId);
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
    queryFn: async () => loadPlacesFn({ data: { eventId } }),
  });
}
