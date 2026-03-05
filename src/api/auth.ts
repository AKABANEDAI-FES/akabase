import { factory } from "./libs";
import { auth } from "@/libs/auth";
import { env } from "cloudflare:workers";
import { cors } from "hono/cors";

const authHandler = factory.createHandlers((c) => {
  return auth.handler(c.req.raw);
});

export const authRoute = factory
  .createApp()
  .use(
    "/*",
    cors({
      origin: env.BETTER_AUTH_URL,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["POST", "GET", "OPTIONS"],
      exposeHeaders: ["Content-Length"],
      maxAge: 600,
      credentials: true,
    }),
  )
  .on(["GET", "POST"], "/*", ...authHandler);
