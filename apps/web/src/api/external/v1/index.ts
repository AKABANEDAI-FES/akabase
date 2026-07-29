import { cors } from "hono/cors";
import { apiKeyMiddleware, externalFactory } from "../libs";
import { projectsRoute } from "./projects";

export const v1Route = externalFactory
  .createApp()
  .use(
    "/*",
    cors({
      origin: "*",
      allowHeaders: ["Content-Type", "x-api-key"],
      allowMethods: ["GET", "OPTIONS"],
      maxAge: 600,
    }),
  )
  .use("/*", apiKeyMiddleware)
  .route("/projects", projectsRoute);
