import type { ApiType } from ".";
import { hc } from "hono/client";

export const apiClient = hc<ApiType>("/api");
