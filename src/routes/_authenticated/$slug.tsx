import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { css } from "styled-system/css";
import { Stack } from "styled-system/jsx";
import { Building2Icon, CalendarClockIcon, MapPinIcon, TagIcon, UsersIcon } from "lucide-react";
import { Button, Heading, Text } from "@/components/ui";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions/queries";

export const Route = createFileRoute("/_authenticated/$slug")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(generateLoadEventBySlugQueryOptions(params.slug));
  },
  component: SlugLayout,
});

function SlugLayout() {
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));

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
            {event.name}
          </Heading>

          <Stack gap="2">
            <Text textStyle="xs" fontWeight="semibold" color="fg.muted" pl="3.5">
              委員会管理
            </Text>
            <Stack gap="1">
              <NavLink to="/$slug/committee/organizations" params={{ slug }}>
                <Building2Icon />
                団体管理
              </NavLink>
              <NavLink to="/$slug/committee/tags" params={{ slug }}>
                <TagIcon />
                タグ管理
              </NavLink>
              <NavLink to="/$slug/committee/places" params={{ slug }}>
                <MapPinIcon />
                場所管理
              </NavLink>
              <NavLink to="/$slug/committee/deadlines" params={{ slug }}>
                <CalendarClockIcon />
                締切管理
              </NavLink>
              <NavLink to="/$slug/committee/members" params={{ slug }}>
                <UsersIcon />
                メンバー管理
              </NavLink>
            </Stack>
          </Stack>
        </Stack>
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  );
}

interface NavLinkProps {
  to: string;
  params: Record<string, string>;
  children: React.ReactNode;
}

function NavLink({ to, params, children }: NavLinkProps) {
  return (
    <Button variant="plain" size="md" asChild>
      <Link
        to={to}
        params={params}
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
