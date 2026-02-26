import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listTags } from "@/application/query/event/list-tags";
import { authMiddleware } from "@/libs/session-server";
import { eventIdSchema } from "@/domain/shared/ids";
import { queryOptions } from "@tanstack/react-query";

/**
 * Server function to load tags for an event
 */
export const loadTagsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data }) => {
    return await listTags(data.eventId);
  });

/**
 * Generate cache key for tags list
 */
export function generateLoadTagsCacheKey(eventId: string) {
  return ["events", eventId, "tags"];
}

/**
 * Generate query options for tags list
 */
export function generateLoadTagsQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadTagsCacheKey(eventId),
    queryFn: () => loadTagsFn({ data: { eventId } }),
  });
}
