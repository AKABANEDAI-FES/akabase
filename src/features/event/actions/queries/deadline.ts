import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listDeadlines } from "@/application/query/event/list-deadlines";
import { authMiddleware } from "@/libs/session-server";
import { eventIdSchema } from "@/domain/shared/ids";
import { queryOptions } from "@tanstack/react-query";
import { dependencies } from "@/infrastructure/di";

/**
 * Server function to load deadlines for an event
 */
export const loadDeadlinesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data }) => {
    return await listDeadlines(dependencies, data.eventId);
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
    queryFn: () => loadDeadlinesFn({ data: { eventId } }),
  });
}
