import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/libs/auth";
import { dependenciesMiddleware } from "@/libs/dependencies";
import { listApiKeys } from "@akabase/application/query/api-key/list-api-keys";
import { resolveActor } from "@akabase/application/query/authorization/resolve-actor";
import { cast } from "@akabase/domain/shared/ids";
import type { UserId } from "@akabase/domain/user/schema";
import { queryOptions } from "@tanstack/react-query";

export const loadApiKeysFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .handler(async ({ context }) => {
    const actor = await resolveActor(context.dependencies, {
      userId: cast<UserId>(context.session.user.id),
    });

    return await listApiKeys(context.dependencies, actor);
  });

export function generateLoadApiKeysCacheKey() {
  return ["api-keys"];
}

export function generateLoadApiKeysQueryOptions() {
  return queryOptions({
    queryKey: generateLoadApiKeysCacheKey(),
    queryFn: loadApiKeysFn,
  });
}
