import { createFactory } from "hono/factory";
import { apiKeyMetadataSchema } from "@akabase/domain/api-key/schema";
import type { EventId } from "@akabase/domain/event/schema";
import type { ApiVariables } from "../libs";

export const externalFactory = createFactory<{
  Variables: ApiVariables & { eventId: EventId };
}>();

export const apiKeyMiddleware = externalFactory.createMiddleware(async (c, next) => {
  const key = c.req.header("x-api-key");
  if (key === undefined) {
    return c.json({ message: `x-api-key header is required` }, { status: 401 });
  }

  const result = await c.var.auth.api.verifyApiKey({ body: { key } });
  if (!result.valid || result.key === null) {
    return c.json({ message: "Invalid API key" }, { status: 401 });
  }

  const metadata = apiKeyMetadataSchema.safeParse(result.key.metadata);
  if (!metadata.success) {
    return c.json({ message: "This API key is not bound to an event" }, { status: 403 });
  }

  c.set("eventId", metadata.data.eventId);
  await next();
});
