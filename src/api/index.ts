import { authRoute } from "./auth";
import { factory } from "./libs";
import { storageRoute } from "./storage";

const api = factory.createApp().route("/auth", authRoute).route("/storage", storageRoute);

export const app = factory.createApp().route("/api", api);

export type ApiType = typeof api;
