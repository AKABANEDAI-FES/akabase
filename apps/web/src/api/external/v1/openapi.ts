import { resolver } from "hono-openapi";
import type { GenerateSpecOptions } from "hono-openapi";
import { errorResponseSchema } from "./schemas";

export const openApiSpecOptions = {
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
} as const satisfies Partial<GenerateSpecOptions>;
