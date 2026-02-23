import { createFileRoute, redirect } from "@tanstack/react-router";
import { generateLoadRecentActiveEventQueryOptions } from "@/features/event/actions";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    const recentActiveEvent = await context.queryClient.ensureQueryData(
      generateLoadRecentActiveEventQueryOptions(),
    );

    if (recentActiveEvent) {
      throw redirect({
        to: "/$slug",
        params: { slug: recentActiveEvent.slug },
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello, World!</div>;
}
