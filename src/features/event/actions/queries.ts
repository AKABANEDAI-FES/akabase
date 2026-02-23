import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@praha/byethrow";
import { getEventDetail } from "@/application/query/event/get-event-detail";
import { authMiddleware } from "@/libs/session-server";
import { eventIdSchema } from "@/domain/shared/ids";
import { listEvents } from "@/application/query/event/list-events";
import { getRecentActiveEvent } from "@/application/query/event/get-recent-active-event";
import { getEventBySlug } from "@/application/query/event/get-event-by-slug";
import { queryOptions } from "@tanstack/react-query";

export const loadEventsFn = createServerFn({ method: "GET" }).handler(async () => {
  const result = await listEvents();

  if (Result.isFailure(result)) {
    throw new Error(result.error.message);
  }

  return result.value;
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
    const result = await getEventDetail(data.eventId);

    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }

    return result.value;
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
  const result = await getRecentActiveEvent();

  if (Result.isFailure(result)) {
    throw new Error(result.error.message);
  }

  return result.value;
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
    const result = await getEventBySlug(data.slug);

    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }

    if (!result.value) {
      throw new Error("イベントが見つかりませんでした。");
    }

    return result.value;
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
