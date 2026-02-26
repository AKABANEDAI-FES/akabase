import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { css } from "styled-system/css";
import { Stack } from "styled-system/jsx";
import {
  Building2Icon,
  CalendarClockIcon,
  FileClockIcon,
  MapPinIcon,
  TagIcon,
  UsersIcon,
} from "lucide-react";
import { Button, Heading, Text } from "@/components/ui";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions/queries";
import { generateCheckCommitteeRoleQueryOptions } from "@/features/authorization/actions";
import { generateLoadMyOrganizationsQueryOptions } from "@/features/organization/actions/queries";

export const Route = createFileRoute("/_authenticated/$slug")({
  loader: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    await Promise.all([
      context.queryClient.ensureQueryData(generateCheckCommitteeRoleQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateLoadMyOrganizationsQueryOptions(event.id)),
    ]);
  },
  component: SlugLayout,
});

function SlugLayout() {
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));
  const {
    data: { committeeRole },
  } = useSuspenseQuery(generateCheckCommitteeRoleQueryOptions(event.id));

  const isCommitteeMember = committeeRole !== "default";

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

          {isCommitteeMember && (
            <Stack gap="2">
              <Text textStyle="xs" fontWeight="semibold" color="fg.muted" pl="3.5">
                委員会管理
              </Text>
              <Stack gap="1">
                <NavLink>
                  <Link to="/$slug/committee/organizations" params={{ slug }}>
                    <Building2Icon />
                    出展団体管理
                  </Link>
                </NavLink>
                <NavLink>
                  <Link to="/$slug/committee/tags" params={{ slug }}>
                    <TagIcon />
                    タグ管理
                  </Link>
                </NavLink>
                <NavLink>
                  <Link to="/$slug/committee/places" params={{ slug }}>
                    <MapPinIcon />
                    場所管理
                  </Link>
                </NavLink>
                <NavLink>
                  <Link to="/$slug/committee/deadlines" params={{ slug }}>
                    <CalendarClockIcon />
                    締切管理
                  </Link>
                </NavLink>
                <NavLink>
                  <Link to="/$slug/committee/members" params={{ slug }}>
                    <UsersIcon />
                    メンバー管理
                  </Link>
                </NavLink>
                <NavLink>
                  <Link to="/$slug/committee/submissions" params={{ slug }}>
                    <FileClockIcon />
                    提出一覧
                  </Link>
                </NavLink>
              </Stack>
            </Stack>
          )}

          <Stack gap="2">
            <Text textStyle="xs" fontWeight="semibold" color="fg.muted" pl="3.5">
              出展団体管理
            </Text>
            <Stack gap="1">
              <OrganizationLinks slug={slug} />
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
  children: React.ReactNode;
}

function NavLink({ children }: NavLinkProps) {
  return (
    <Button
      variant="plain"
      size="md"
      colorPalette="gray"
      justifyContent="flex-start"
      css={{
        _currentPage: {
          backgroundColor: "colorPalette.plain.bg.hover",
          color: "colorPalette.surface.fg",
          _hover: {
            backgroundColor: "colorPalette.plain.bg.active",
          },
        },
      }}
      asChild
    >
      {children}
    </Button>
  );
}

function OrganizationLinks({ slug }: { slug: string }) {
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));
  const { data: myOrganizations } = useSuspenseQuery(
    generateLoadMyOrganizationsQueryOptions(event.id),
  );

  return (
    <>
      {myOrganizations.map((org) => (
        <NavLink key={org.id}>
          <Link to="/$slug/org/$orgId" params={{ slug, orgId: org.id }}>
            {org.name}
          </Link>
        </NavLink>
      ))}
    </>
  );
}
