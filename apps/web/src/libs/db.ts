import { env } from "cloudflare:workers";
import { createServerOnlyFn } from "@tanstack/react-start";
import { createDb } from "@archive/infrastructure/db";

export const createDbFn = createServerOnlyFn(() => createDb(env.DB));
