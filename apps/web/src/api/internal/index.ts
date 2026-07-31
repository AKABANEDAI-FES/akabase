import { factory } from "../libs";
import { authRoute } from "./auth";
import { storageRoute } from "./storage";

export const internalRoute = factory
  .createApp()
  .route("/auth", authRoute)
  .route("/storage", storageRoute);

export type InternalApiType = typeof internalRoute;
