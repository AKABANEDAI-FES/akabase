import { authRoute } from "./auth";
import { externalRoute } from "./external";
import { depsMiddleware, factory } from "./libs";
import { storageRoute } from "./storage";

const api = factory
  .createApp()
  .use("*", depsMiddleware)
  .route("/auth", authRoute)
  .route("/storage", storageRoute)
  .route("/", externalRoute);

export const app = factory.createApp().route("/api", api);

export type ApiType = typeof api;
