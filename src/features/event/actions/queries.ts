import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@praha/byethrow";
import { getEventDetail } from "@/application/query/event/get-event-detail";
import { authMiddleware } from "@/libs/session-server";
import { eventIdSchema } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";

/**
 * Server function to load event detail
 */
export const loadEventDetailFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data }) => {
    const result = await getEventDetail(data.eventId as EventId);

    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }

    return result.value;
  });
