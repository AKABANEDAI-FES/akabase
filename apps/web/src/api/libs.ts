import { createAuth } from "@akabase/infrastructure/auth";
import type { Auth, Session } from "@akabase/infrastructure/auth";
import { createDb } from "@akabase/infrastructure/db";
import type { Database } from "@akabase/infrastructure/db";
import { env } from "cloudflare:workers";
import { createFactory } from "hono/factory";

export const factory = createFactory<{
  Variables: {
    auth: Auth;
    db: Database;
    user: Session["user"] | null;
    session: Session["session"] | null;
  };
}>();

export const depsMiddleware = factory.createMiddleware(async (c, next) => {
  const db = createDb(env.DB);
  const auth = createAuth(db, {
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
    ADMIN_EMAILS: env.ADMIN_EMAILS,
  });
  c.set("auth", auth);
  c.set("db", db);
  await next();
});

export const authMiddleware = factory.createMiddleware(async (c, next) => {
  const headers = c.req.header();
  const session = await c.var.auth.api.getSession({ headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});
