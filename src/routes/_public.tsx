import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
});

function PublicLayout() {
  return (
    <div>
      {/* Minimal layout for public pages */}
      <Outlet />
    </div>
  );
}
