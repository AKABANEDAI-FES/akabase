import { cors } from "hono/cors";
import { openAPIRouteHandler } from "hono-openapi";
import { apiKeyMiddleware, externalFactory } from "../libs";
import { openApiSpecOptions } from "./openapi";
import { projectsRoute } from "./projects";

const app = externalFactory.createApp().use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "x-api-key"],
    allowMethods: ["GET", "OPTIONS"],
    maxAge: 600,
  }),
);

export const v1Route = app
  .get("/openapi.json", openAPIRouteHandler(app, openApiSpecOptions))
  .use("/*", apiKeyMiddleware)
  .route("/projects", projectsRoute);
