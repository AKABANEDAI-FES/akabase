import { cors } from "hono/cors";
import { openAPIRouteHandler, resolver } from "hono-openapi";
import { apiKeyMiddleware, externalFactory } from "../libs";
import { errorResponseSchema } from "./schemas";
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
  .get(
    "/openapi.json",
    openAPIRouteHandler(app, {
      documentation: {
        info: {
          title: "AKABASE External API",
          version: "1.0.0",
          description: "akabanedai-fes.com 等の外部サービス向けに企画情報を提供する API です",
        },
        servers: [{ url: "/api/v1" }],
        components: {
          securitySchemes: {
            apiKey: { type: "apiKey", in: "header", name: "x-api-key" },
          },
        },
        security: [{ apiKey: [] }],
      },
      defaultOptions: {
        GET: {
          responses: {
            401: {
              description: "API キーが指定されていない、もしくは無効です",
              content: { "application/json": { schema: resolver(errorResponseSchema) } },
            },
            403: {
              description: "API キーがイベントに紐づいていません",
              content: { "application/json": { schema: resolver(errorResponseSchema) } },
            },
          },
        },
      },
    }),
  )
  .use("/*", apiKeyMiddleware)
  .route("/projects", projectsRoute);
