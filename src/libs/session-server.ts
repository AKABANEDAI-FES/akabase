import { auth } from "@/libs/auth";
import type { Session } from "@/libs/auth";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

export type SessionData = Session | null;

/**
 * Get current session from request context
 * Use in server functions, loaders, and actions
 */
export const getSessionFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionData> => {
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
