import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { Stack } from "styled-system/jsx";
import { CalendarIcon, UsersIcon } from "lucide-react";
import { NavLink, SidebarLayout } from "@/components/sidebar-layout";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    // Check if user has admin role
    if (context.session?.user.role !== "admin") {
      throw redirect({
        to: "/",
      });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <SidebarLayout title="管理画面">
      <Stack gap="1">
        <NavLink>
          <Link to="/admin/events">
            <CalendarIcon />
            イベント
          </Link>
        </NavLink>
        <NavLink>
          <Link to="/admin/users">
            <UsersIcon />
            ユーザー
          </Link>
        </NavLink>
      </Stack>
    </SidebarLayout>
  );
}
