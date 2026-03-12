import { createAuth } from "@archive/infrastructure/auth";
import type { Auth, Session } from "@archive/infrastructure/auth";
import { createDbFn } from "./db";
import { env } from "cloudflare:workers";
import { createMiddleware, createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";

export const createAuthFn = createServerOnlyFn(() =>
  createAuth(createDbFn(), {
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
    ADMIN_EMAILS: env.ADMIN_EMAILS,
  }),
);

export const authClient = createAuthClient({
  plugins: [adminClient(), inferAdditionalFields<Auth>()],
});

export type SessionData = Session | null;

/**
 * Get current session from request context
 * Use in server functions, loaders, and actions
 */
export const getSessionFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionData> => {
    const auth = createAuthFn();
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    return session;
  },
);

export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const session = await getSessionFn();

  if (!session) {
    throw new Error("Failed to get session");
  }

  return next({
    context: {
      session,
    },
  });
});
