import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listProjectCategories } from "@akabase/application/query/event/list-project-categories";
import { authMiddleware } from "@/libs/auth";
import { eventIdSchema } from "@akabase/domain/event/schema";
import { queryOptions } from "@tanstack/react-query";
import { dependenciesMiddleware } from "@/libs/dependencies";

/**
 * Server function to load project categories for an event
 */
export const loadProjectCategoriesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    return await listProjectCategories(context.dependencies, data.eventId);
  });

/**
 * Generate cache key for project categories list
 */
export function generateLoadProjectCategoriesCacheKey(eventId: string) {
  return ["events", eventId, "project-categories"];
}

/**
 * Generate query options for project categories list
 */
export function generateLoadProjectCategoriesQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadProjectCategoriesCacheKey(eventId),
    queryFn: async () => loadProjectCategoriesFn({ data: { eventId } }),
  });
}
