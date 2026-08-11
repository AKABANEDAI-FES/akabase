import { factory } from "../libs";

export const authMiddleware = factory.createMiddleware(async (c, next) => {
  const headers = c.req.header();
  const session = await c.var.auth.api.getSession({ headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});
