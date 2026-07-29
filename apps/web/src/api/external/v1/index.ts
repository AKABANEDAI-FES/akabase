import { cors } from "hono/cors";
import { Scalar } from "@scalar/hono-api-reference";
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
          description:
            "学祭サイト向けに公開企画情報を提供する API です。リクエストには `x-api-key` ヘッダーで API キーを指定してください。",
        },
        servers: [{ url: "/api/external/v1" }],
        components: {
          securitySchemes: {
            apiKey: { type: "apiKey", in: "header", name: "x-api-key" },
          },
        },
        security: [{ apiKey: [] }],
      },
      exclude: ["/docs"],
      defaultOptions: {
        GET: {
          responses: {
            401: {
              description: "API キーが指定されていないか、無効です",
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
  .get("/docs", Scalar({ url: "/api/external/v1/openapi.json" }))
  .use("/*", apiKeyMiddleware)
  .route("/projects", projectsRoute);
