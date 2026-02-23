import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadRecentActiveEventFn } from "@/features/event/actions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const recentActiveEvent = await loadRecentActiveEventFn();

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
