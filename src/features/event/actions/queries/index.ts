import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getEventDetail } from "@/application/query/event/get-event-detail";
import { authMiddleware } from "@/libs/session-server";
import { eventIdSchema } from "@/domain/shared/ids";
import { listEvents } from "@/application/query/event/list-events";
import { getRecentActiveEvent } from "@/application/query/event/get-recent-active-event";
import { getEventBySlug } from "@/application/query/event/get-event-by-slug";
import { queryOptions } from "@tanstack/react-query";
import { dependencies } from "@/infrastructure/di";
import { NotFoundError } from "@/libs/error";

export const loadEventsFn = createServerFn({ method: "GET" }).handler(async () => {
  return await listEvents(dependencies);
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
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data }) => {
    const event = await getEventDetail(dependencies, data.eventId);
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
    queryFn: () => loadEventDetailFn({ data: { eventId } }),
  });
}

export const loadRecentActiveEventFn = createServerFn({ method: "GET" }).handler(async () => {
  return await getRecentActiveEvent(dependencies);
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
  .inputValidator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    const event = await getEventBySlug(dependencies, data.slug);

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
    queryFn: () => loadEventBySlugFn({ data: { slug } }),
  });
}

// Re-export sub-modules
export * from "./deadline";
export * from "./place";
export * from "./tag";
