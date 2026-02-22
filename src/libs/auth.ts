import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "cloudflare:workers";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { admin } from "better-auth/plugins/admin";
import { db } from "@/db";

export const auth = betterAuth({
  plugins: [admin(), tanstackStartCookies()],
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  secret: env.BETTER_AUTH_SECRET,
  // baseURL: env.BETTER_AUTH_URL,
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      hd: "toyo.jp",
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
          if (env.ADMIN_EMAILS.includes(user.email as (typeof env.ADMIN_EMAILS)[number])) {
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

export type Session = typeof auth.$Infer.Session;
