import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listDeadlines } from "@akabase/application/query/event/list-deadlines";
import { authMiddleware } from "@/libs/auth";
import { eventIdSchema } from "@akabase/domain/event/schema";
import { queryOptions } from "@tanstack/react-query";
import { dependenciesMiddleware } from "@/libs/dependencies";

/**
 * Server function to load deadlines for an event
 */
export const loadDeadlinesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    return await listDeadlines(context.dependencies, data.eventId);
  });

/**
 * Generate cache key for deadlines list
 */
export function generateLoadDeadlinesCacheKey(eventId: string) {
  return ["events", eventId, "deadlines"];
}

/**
 * Generate query options for deadlines list
 */
export function generateLoadDeadlinesQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadDeadlinesCacheKey(eventId),
    queryFn: async () => loadDeadlinesFn({ data: { eventId } }),
  });
}
