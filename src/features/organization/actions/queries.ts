import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@praha/byethrow";
import { listOrganizations } from "@/application/query/organization/list-organizations";
import { authMiddleware } from "@/libs/session-server";
import { eventIdSchema } from "@/domain/shared/ids";
import { queryOptions } from "@tanstack/react-query";

/**
 * Server function to load organizations for an event
 */
export const loadOrganizationsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data }) => {
    const result = await listOrganizations(data.eventId);

    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }

    return result.value;
  });

export function generateLoadOrganizationsCacheKey(eventId: string) {
  return ["organizations", "for-event", eventId];
}

export function generateLoadOrganizationsQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadOrganizationsCacheKey(eventId),
    queryFn: () => loadOrganizationsFn({ data: { eventId } }),
  });
}
