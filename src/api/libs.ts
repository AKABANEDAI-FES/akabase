import { auth } from "@/libs/auth";
import { createFactory } from "hono/factory";

export const factory = createFactory<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

export const authMiddleware = factory.createMiddleware(async (c, next) => {
  const headers = c.req.header();
  const session = await auth.api.getSession({ headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});
