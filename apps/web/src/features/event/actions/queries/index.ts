import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getEventDetail } from "@akabase/application/query/event/get-event-detail";
import { authMiddleware } from "@/libs/auth";
import { eventIdSchema } from "@akabase/domain/event/schema";
import { listEvents } from "@akabase/application/query/event/list-events";
import { getRecentActiveEvent } from "@akabase/application/query/event/get-recent-active-event";
import { getEventBySlug } from "@akabase/application/query/event/get-event-by-slug";
import { queryOptions } from "@tanstack/react-query";
import { dependenciesMiddleware } from "@/libs/dependencies";
import { NotFoundError } from "@/libs/error";

export const loadEventsFn = createServerFn({ method: "GET" })
  .middleware([dependenciesMiddleware])
  .handler(async ({ context }) => {
    return await listEvents(context.dependencies);
  });

export function generateLoadEventsCacheKey() {
  return ["events"];
}

export function generateLoadEventsQueryOptions() {
  return queryOptions({
    queryKey: generateLoadEventsCacheKey(),
    queryFn: loadEventsFn,
  });
}

export const loadEventDetailFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const event = await getEventDetail(context.dependencies, data.eventId);
    if (!event) {
      throw new Error("イベントが見つかりませんでした");
    }
    return event;
  });

export function generateLoadEventDetailCacheKey(eventId: string) {
  return ["events", eventId];
}

export function generateLoadEventDetailQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadEventDetailCacheKey(eventId),
    queryFn: async () => loadEventDetailFn({ data: { eventId } }),
  });
}

export const loadRecentActiveEventFn = createServerFn({ method: "GET" })
  .middleware([dependenciesMiddleware])
  .handler(async ({ context }) => {
    return await getRecentActiveEvent(context.dependencies);
  });

export function generateLoadRecentActiveEventCacheKey() {
  return ["events", "recent-active"];
}

export function generateLoadRecentActiveEventQueryOptions() {
  return queryOptions({
    queryKey: generateLoadRecentActiveEventCacheKey(),
    queryFn: loadRecentActiveEventFn,
  });
}

export const loadEventBySlugFn = createServerFn({ method: "GET" })
  .middleware([dependenciesMiddleware])
  .inputValidator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const event = await getEventBySlug(context.dependencies, data.slug);

    if (!event) {
      throw new NotFoundError("イベントが見つかりませんでした。");
    }

    return event;
  });

export function generateLoadEventBySlugCacheKey(slug: string) {
  return ["events", "by-slug", slug];
}

export function generateLoadEventBySlugQueryOptions(slug: string) {
  return queryOptions({
    queryKey: generateLoadEventBySlugCacheKey(slug),
    queryFn: async () => loadEventBySlugFn({ data: { slug } }),
  });
}
