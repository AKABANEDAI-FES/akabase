import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@praha/byethrow";
import { listDeadlines } from "@/application/query/event/list-deadlines";
import { authMiddleware } from "@/libs/session-server";
import { eventIdSchema } from "@/domain/shared/ids";
import { queryOptions } from "@tanstack/react-query";

/**
 * Server function to load deadlines for an event
 */
export const loadDeadlinesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data }) => {
    const result = await listDeadlines(data.eventId);

    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }

    return result.value;
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
