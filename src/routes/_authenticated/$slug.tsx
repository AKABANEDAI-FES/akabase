import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Building2Icon,
  CalendarClockIcon,
  FileClockIcon,
  MapPinIcon,
  TagIcon,
  UsersIcon,
} from "lucide-react";
import { NavLink, NavSection, SidebarLayout } from "@/components/sidebar-layout";
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
    <SidebarLayout
      title={event.name}
      navigation={(onNavigate) => (
        <>
          {isCommitteeMember && (
            <NavSection label="委員会管理">
              <NavLink onNavigate={onNavigate}>
                <Link to="/$slug/committee/organizations" params={{ slug }}>
                  <Building2Icon />
                  出展団体管理
                </Link>
              </NavLink>
              <NavLink onNavigate={onNavigate}>
                <Link to="/$slug/committee/tags" params={{ slug }}>
                  <TagIcon />
                  タグ管理
                </Link>
              </NavLink>
              <NavLink onNavigate={onNavigate}>
                <Link to="/$slug/committee/places" params={{ slug }}>
                  <MapPinIcon />
                  場所管理
                </Link>
              </NavLink>
              <NavLink onNavigate={onNavigate}>
                <Link to="/$slug/committee/deadlines" params={{ slug }}>
                  <CalendarClockIcon />
                  締切管理
                </Link>
              </NavLink>
              <NavLink onNavigate={onNavigate}>
                <Link to="/$slug/committee/members" params={{ slug }}>
                  <UsersIcon />
                  メンバー管理
                </Link>
              </NavLink>
              <NavLink onNavigate={onNavigate}>
                <Link to="/$slug/committee/submissions" params={{ slug }}>
                  <FileClockIcon />
                  提出一覧
                </Link>
              </NavLink>
            </NavSection>
          )}

          <NavSection label="出展団体管理">
            <OrganizationLinks slug={slug} onNavigate={onNavigate} />
          </NavSection>
        </>
      )}
    />
  );
}

function OrganizationLinks({ slug, onNavigate }: { slug: string; onNavigate?: () => void }) {
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));
  const { data: myOrganizations } = useSuspenseQuery(
    generateLoadMyOrganizationsQueryOptions(event.id),
  );

  return (
    <>
      {myOrganizations.map((org) => (
        <NavLink key={org.id} onNavigate={onNavigate}>
          <Link to="/$slug/orgs/$orgId" params={{ slug, orgId: org.id }}>
            {org.name}
          </Link>
        </NavLink>
      ))}
    </>
  );
}
