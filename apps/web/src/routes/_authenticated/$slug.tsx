import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Building2Icon,
  CalendarClockIcon,
  DownloadIcon,
  FileClockIcon,
  HomeIcon,
  MapPinIcon,
  SettingsIcon,
  ShapesIcon,
  TagIcon,
  UsersIcon,
} from "lucide-react";
import { NavLink, NavSection, SidebarLayout } from "@/components/sidebar-layout";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions/queries";
import { generateCheckCommitteeRoleQueryOptions } from "@/features/authorization/actions/queries";
import { generateLoadMyOrganizationsQueryOptions } from "@/features/organization/actions/queries";
import { handleNotFoundError } from "@/libs/error";

export const Route = createFileRoute("/_authenticated/$slug")({
  beforeLoad: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    return {
      activeEvent: event,
    };
  },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        generateCheckCommitteeRoleQueryOptions(context.activeEvent.id),
      ),
      context.queryClient.ensureQueryData(
        generateLoadMyOrganizationsQueryOptions(context.activeEvent.id),
      ),
    ]);
  },
  component: SlugLayout,
  onError: handleNotFoundError,
});

function SlugLayout() {
  const { activeEvent: event } = Route.useRouteContext();
  const { slug } = Route.useParams();
  const {
    data: { committeeRole },
  } = useSuspenseQuery(generateCheckCommitteeRoleQueryOptions(event.id));

  const isCommitteeMember = committeeRole !== "default";

  return (
    <SidebarLayout title={event.name}>
      <NavLink>
        <Link to="/$slug" params={{ slug }} activeOptions={{ exact: true }}>
          <HomeIcon />
          ホーム
        </Link>
      </NavLink>
      {isCommitteeMember && (
        <NavSection label="委員会管理">
          <NavLink>
            <Link to="/$slug/committee/organizations" params={{ slug }}>
              <Building2Icon />
              出展団体
            </Link>
          </NavLink>
          <NavLink>
            <Link to="/$slug/committee/project-categories" params={{ slug }}>
              <ShapesIcon />
              企画区分
            </Link>
          </NavLink>
          <NavLink>
            <Link to="/$slug/committee/tags" params={{ slug }}>
              <TagIcon />
              タグ
            </Link>
          </NavLink>
          <NavLink>
            <Link to="/$slug/committee/places" params={{ slug }}>
              <MapPinIcon />
              場所
            </Link>
          </NavLink>
          <NavLink>
            <Link to="/$slug/committee/deadlines" params={{ slug }}>
              <CalendarClockIcon />
              締切
            </Link>
          </NavLink>
          <NavLink>
            <Link to="/$slug/committee/members" params={{ slug }}>
              <UsersIcon />
              メンバー
            </Link>
          </NavLink>
          <NavLink>
            <Link to="/$slug/committee/submissions" params={{ slug }}>
              <FileClockIcon />
              提出一覧
            </Link>
          </NavLink>
          <NavLink>
            <Link to="/$slug/committee/export" params={{ slug }}>
              <DownloadIcon />
              データエクスポート
            </Link>
          </NavLink>
          <NavLink>
            <Link to="/$slug/committee/settings" params={{ slug }}>
              <SettingsIcon />
              詳細設定
            </Link>
          </NavLink>
        </NavSection>
      )}

      <NavSection label="出展団体管理">
        <OrganizationLinks slug={slug} />
      </NavSection>
    </SidebarLayout>
  );
}

function OrganizationLinks({ slug }: { slug: string }) {
  const { activeEvent: event } = Route.useRouteContext();
  const { data: myOrganizations } = useSuspenseQuery(
    generateLoadMyOrganizationsQueryOptions(event.id),
  );

  return (
    <>
      {myOrganizations.map((org) => (
        <NavLink key={org.id}>
          <Link to="/$slug/orgs/$orgId" params={{ slug, orgId: org.id }}>
            {org.name}
          </Link>
        </NavLink>
      ))}
    </>
  );
}
