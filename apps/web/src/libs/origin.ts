import { env } from "cloudflare:workers";
import { createServerOnlyFn } from "@tanstack/react-start";

export const getAppOriginFn = createServerOnlyFn(() => env.BETTER_AUTH_URL);
