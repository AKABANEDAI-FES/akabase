import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions";
import { generateCheckCommitteeRoleQueryOptions } from "@/features/authorization/actions";

export const Route = createFileRoute("/_authenticated/$slug/committee")({
  beforeLoad: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    const { committeeRole } = await context.queryClient.ensureQueryData(
      generateCheckCommitteeRoleQueryOptions(event.id),
    );
    if (committeeRole === "default") {
      throw redirect({ to: "/$slug", params });
    }
  },
  component: () => <Outlet />,
});
