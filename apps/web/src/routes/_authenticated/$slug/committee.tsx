import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { generateCheckCommitteeRoleQueryOptions } from "@/features/authorization/actions/queries";

export const Route = createFileRoute("/_authenticated/$slug/committee")({
  beforeLoad: async ({ params, context }) => {
    const { committeeRole } = await context.queryClient.ensureQueryData(
      generateCheckCommitteeRoleQueryOptions(context.activeEvent.id),
    );
    if (committeeRole === "default") {
      throw redirect({ to: "/$slug", params });
    }
  },
  component: () => <Outlet />,
});
