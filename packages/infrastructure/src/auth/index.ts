import { betterAuth } from "better-auth/minimal";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import type { Database } from "../db";

type Env = {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  ADMIN_EMAILS: readonly string[];
};

export function createAuth(db: Database, env: Env) {
  return betterAuth({
    plugins: [admin()],
    database: drizzleAdapter(db, {
      provider: "sqlite",
    }),
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
