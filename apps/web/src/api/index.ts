import { externalRoute } from "./external";
import { internalRoute } from "./internal";
import { depsMiddleware, factory } from "./libs";

const api = factory
  .createApp()
  .use("*", depsMiddleware)
  .route("/", internalRoute)
  .route("/", externalRoute);

export const app = factory.createApp().route("/api", api);
