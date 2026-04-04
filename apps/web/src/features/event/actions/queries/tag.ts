import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listTags } from "@akabase/application/query/event/list-tags";
import { authMiddleware } from "@/libs/auth";
import { eventIdSchema } from "@akabase/domain/event/schema";
import { queryOptions } from "@tanstack/react-query";
import { dependenciesMiddleware } from "@/libs/dependencies";

/**
 * Server function to load tags for an event
 */
export const loadTagsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    return await listTags(context.dependencies, data.eventId);
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
    queryFn: async () => loadTagsFn({ data: { eventId } }),
  });
}
