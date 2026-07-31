import type { InternalApiType } from ".";
import { hc } from "hono/client";

export const apiClient = hc<InternalApiType>("/api");
