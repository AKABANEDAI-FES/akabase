import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link, createRouteMask, createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import * as TanstackQuery from "./integrations/tanstack-query/root-provider";
import type { SessionData } from "./libs/session-server";
import { Grid, VStack } from "@archive/styled-system/jsx";
import { RotateCcwIcon, SearchXIcon, TriangleAlertIcon } from "lucide-react";
import { Button, Heading, Icon, Text } from "./components/ui";

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
    defaultPreloadDelay: 250,
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: ErrorComponent,
  });

  setupRouterSsrQueryIntegration({ router, queryClient: rqContext.queryClient });

  return router;
};

function NotFound() {
  return (
    <Grid placeItems="center" minH="100svh" bg="bg.canvas">
      <VStack gap="4" px="4" alignItems="center">
        <Icon size="lg">
          <SearchXIcon />
        </Icon>
        <VStack gap="1" textAlign="center">
          <Heading as="h1" textStyle="xl">
            ページが見つかりません
          </Heading>
          <Text textStyle="sm" color="fg.muted">
            お探しのページは存在しないか、移動した可能性があります
          </Text>
        </VStack>
        <Button asChild mt="2">
          <Link to="/">ホームに戻る</Link>
        </Button>
      </VStack>
    </Grid>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  return (
    <Grid placeItems="center" minH="100svh" bg="bg.canvas">
      <VStack gap="4" px="4" alignItems="center">
        <Icon size="lg" color="fg.error">
          <TriangleAlertIcon />
        </Icon>
        <VStack gap="1" textAlign="center">
          <Heading as="h1" textStyle="xl">
            エラーが発生しました
          </Heading>
          <Text textStyle="sm" color="fg.muted">
            {error.message || "予期しないエラーが発生しました"}
          </Text>
        </VStack>
        <Button onClick={reset} mt="2">
          <RotateCcwIcon />
          再試行
        </Button>
      </VStack>
    </Grid>
  );
}
