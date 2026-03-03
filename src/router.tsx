import { createRouteMask, createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import * as TanstackQuery from "./integrations/tanstack-query/root-provider";
import type { SessionData } from "./libs/session-server";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

const createEventModalMask = createRouteMask({
  routeTree,
  from: "/admin/events/new",
  to: "/admin/events",
});

const createOrganizationModalMask = createRouteMask({
  routeTree,
  from: "/$slug/committee/organizations/new",
  to: "/$slug/committee/organizations",
  params: (prev) => ({ slug: prev.slug }),
});

const createTagModalMask = createRouteMask({
  routeTree,
  from: "/$slug/committee/tags/new",
  to: "/$slug/committee/tags",
  params: (prev) => ({ slug: prev.slug }),
});

const editTagModalMask = createRouteMask({
  routeTree,
  from: "/$slug/committee/tags/$tagId/edit",
  to: "/$slug/committee/tags",
  params: (prev) => ({ slug: prev.slug, tagId: prev.tagId }),
});

const createPlaceModalMask = createRouteMask({
  routeTree,
  from: "/$slug/committee/places/new",
  to: "/$slug/committee/places",
  params: (prev) => ({ slug: prev.slug }),
});

const editPlaceModalMask = createRouteMask({
  routeTree,
  from: "/$slug/committee/places/$placeId/edit",
  to: "/$slug/committee/places",
  params: (prev) => ({ slug: prev.slug, placeId: prev.placeId }),
});

const createDeadlineModalMask = createRouteMask({
  routeTree,
  from: "/$slug/committee/deadlines/new",
  to: "/$slug/committee/deadlines",
  params: (prev) => ({ slug: prev.slug }),
});

const editDeadlineModalMask = createRouteMask({
  routeTree,
  from: "/$slug/committee/deadlines/$deadlineId/edit",
  to: "/$slug/committee/deadlines",
  params: (prev) => ({ slug: prev.slug, deadlineId: prev.deadlineId }),
});

const createProjectModalMask = createRouteMask({
  routeTree,
  from: "/$slug/committee/organizations/$orgId/projects/new",
  to: "/$slug/committee/organizations/$orgId/projects",
  params: (prev) => ({ slug: prev.slug, orgId: prev.orgId }),
});

const addOrgMemberForCommitteeModalMask = createRouteMask({
  routeTree,
  from: "/$slug/committee/organizations/$orgId/members/new",
  to: "/$slug/committee/organizations/$orgId/members",
  params: (prev) => ({ slug: prev.slug, orgId: prev.orgId }),
});

const addOrgMemberForOrgModalMask = createRouteMask({
  routeTree,
  from: "/$slug/orgs/$orgId/members/new",
  to: "/$slug/orgs/$orgId/members",
  params: (prev) => ({ slug: prev.slug, orgId: prev.orgId }),
});

// Create a new router instance
export const getRouter = () => {
  const rqContext = TanstackQuery.getContext();

  const router = createRouter({
    routeTree,
    context: {
      ...rqContext,
      session: null as SessionData,
      activeEvent: undefined!,
    },
    routeMasks: [
      createEventModalMask,
      createOrganizationModalMask,
      createTagModalMask,
      editTagModalMask,
      createPlaceModalMask,
      editPlaceModalMask,
      createDeadlineModalMask,
      editDeadlineModalMask,
      createProjectModalMask,
      addOrgMemberForCommitteeModalMask,
      addOrgMemberForOrgModalMask,
    ],
    defaultPreload: "intent",
  });

  setupRouterSsrQueryIntegration({ router, queryClient: rqContext.queryClient });

  return router;
};
