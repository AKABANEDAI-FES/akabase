import { Link, Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { css } from "styled-system/css";
import { Divider, Stack } from "styled-system/jsx";
import { CalendarIcon, UsersIcon } from "lucide-react";
import { Button, Heading } from "@/components/ui";

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

    // Redirect /admin to /admin/events
    if (location.pathname === "/admin" || location.pathname === "/admin/") {
      throw redirect({
        to: "/admin/events",
      });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className={css({ display: "grid", gridTemplateColumns: "auto 1fr", minHeight: "100svh" })}>
      <nav
        className={css({
          width: "xs",
          backgroundColor: "bg.default",
          shadow: "sm",
          padding: "4",
          h: "100vh",
          position: "sticky",
          top: "0",
        })}
      >
        <Stack gap="8">
          <Heading as="h1" textStyle="lg">
            管理画面
          </Heading>

          <Stack gap="1">
            <NavLink to="/admin/events">
              <CalendarIcon />
              イベント管理
            </NavLink>
            <NavLink to="/admin/users">
              <UsersIcon />
              ユーザー管理
            </NavLink>
          </Stack>

          <Divider />

          <Button variant="surface" size="sm" asChild>
            <Link to="/">← ホームに戻る</Link>
          </Button>
        </Stack>
      </nav>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
}

function NavLink({ to, children }: NavLinkProps) {
  return (
    <Button variant="plain" size="md" asChild>
      <Link
        to={to}
        activeOptions={{ exact: to === "/admin" }}
        className={css({
          justifyContent: "flex-start",
        })}
        activeProps={{
          className: css({
            backgroundColor: "colorPalette.surface.bg",
            color: "colorPalette.surface.fg",
            _hover: {
              backgroundColor: "colorPalette.plain.bg.hover",
            },
          }),
        }}
      >
        {children}
      </Link>
    </Button>
  );
}
