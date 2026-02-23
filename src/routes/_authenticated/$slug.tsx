import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$slug")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_authenticated/$slug"!</div>;
}
