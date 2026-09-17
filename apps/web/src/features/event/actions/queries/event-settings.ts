import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getEventSettings } from "@akabase/application/query/event/get-event-settings";
import { authMiddleware } from "@/libs/auth";
import { eventIdSchema } from "@akabase/domain/event/schema";
import { queryOptions } from "@tanstack/react-query";
import { dependenciesMiddleware } from "@/libs/dependencies";

/**
 * Server function to load event settings for an event
 */
export const loadEventSettingsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    return await getEventSettings(context.dependencies, data.eventId);
  });

/**
 * Generate cache key for event settings
 */
export function generateLoadEventSettingsCacheKey(eventId: string) {
  return ["events", eventId, "settings"];
}

/**
 * Generate query options for event settings
 */
export function generateLoadEventSettingsQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadEventSettingsCacheKey(eventId),
    queryFn: async () => loadEventSettingsFn({ data: { eventId } }),
  });
}
