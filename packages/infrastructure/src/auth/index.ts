import { betterAuth } from "better-auth/minimal";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { apiKey } from "@better-auth/api-key";
import { API_KEY_NAME_MAX_LENGTH } from "@akabase/domain/api-key/schema";
import type { Database } from "../db";

export const API_KEY_PREFIX = "akbs_";

type Env = {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  ADMIN_EMAILS: readonly string[];
};

export function createAuth(db: Database, env: Env) {
  return betterAuth({
    plugins: [
      admin(),
      apiKey({
        enableMetadata: true,
        defaultPrefix: API_KEY_PREFIX,
        maximumNameLength: API_KEY_NAME_MAX_LENGTH,
        rateLimit: {
          enabled: false,
        },
      }),
    ],
    database: drizzleAdapter(db, {
      provider: "sqlite",
    }),
    hooks: {
      // API key operations are only exposed through server functions
      // `ctx.request` is only set for HTTP calls, so server-side `auth.api.*` calls stay allowed
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.request !== undefined && ctx.path.startsWith("/api-key/")) {
          throw new APIError("FORBIDDEN", {
            message: "API key endpoints are disabled.",
          });
        }
      }),
    },
    secret: env.BETTER_AUTH_SECRET,
    url: env.BETTER_AUTH_URL,
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        hd: "toyo.jp",
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60, // Cache duration: 1 minutes
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (!user.emailVerified || !user.email.endsWith("@toyo.jp")) {
              throw new APIError("BAD_REQUEST", {
                message: "Email must be verified and belong to @toyo.jp domain.",
              });
            }
            if (env.ADMIN_EMAILS.includes(user.email)) {
              return {
                data: {
                  ...user,
                  role: "admin",
                },
              };
            }
            return { data: user };
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

export type Session = Auth["$Infer"]["Session"];
