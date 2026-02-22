import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Admin route guard
 * Ensures only users with admin role can access /admin routes
 */
export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ context, location }) => {
    // Check if user is authenticated
    if (!context.session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }

    // Check if user has admin role
    if (context.session.user.role !== "admin") {
      throw redirect({
        to: "/",
      });
    }
  },
});
