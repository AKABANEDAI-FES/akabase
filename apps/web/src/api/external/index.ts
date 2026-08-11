import { Scalar } from "@scalar/hono-api-reference";
import { externalFactory } from "./libs";
import { v1Route } from "./v1";

export const externalRoute = externalFactory
  .createApp()
  .onError((error, c) => {
    console.error("External API error:", error);
    return c.json({ message: "Internal server error" }, { status: 500 });
  })
  .get("/docs", Scalar({ sources: [{ url: "/api/v1/openapi.json", title: "v1" }] }))
  .route("/v1", v1Route);
