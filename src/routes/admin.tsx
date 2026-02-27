import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { Stack } from "styled-system/jsx";
import { CalendarIcon, UsersIcon } from "lucide-react";
import { NavLink, SidebarLayout } from "@/components/sidebar-layout";

/**
 * Admin route guard and layout
 * Ensures only users with admin role can access /admin routes
 * Provides navigation menu for admin pages
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
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <SidebarLayout
      title="管理画面"
      navigation={(onNavigate) => (
        <>
          <Stack gap="1">
            <NavLink onNavigate={onNavigate}>
              <Link to="/admin/events">
                <CalendarIcon />
                イベント管理
              </Link>
            </NavLink>
            <NavLink onNavigate={onNavigate}>
              <Link to="/admin/users">
                <UsersIcon />
                ユーザー管理
              </Link>
            </NavLink>
          </Stack>
        </>
      )}
    />
  );
}
