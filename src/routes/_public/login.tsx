import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/libs/auth-client";
import { z } from "zod";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/_public/login")({
  validateSearch: loginSearchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.session) {
      throw redirect({
        to: search.redirect ?? "/",
      });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();

  const handleGoogleLogin = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: search.redirect ?? "/",
    });
  };

  return (
    <div>
      <h1>ログイン</h1>
      <button onClick={handleGoogleLogin}>Googleでログイン</button>
    </div>
  );
}
