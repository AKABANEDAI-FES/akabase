import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { CreateProjectCategoryDialog } from "@/features/event/components/create-project-category-dialog";
import { generateLoadProjectCategoriesQueryOptions } from "@/features/event/actions/queries/project-category";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions/queries";

export const Route = createFileRoute("/_authenticated/$slug/committee/project-categories/new")({
  beforeLoad: async ({ params, context }) => {
    const event = context.activeEvent;
    const permissions = await context.queryClient.ensureQueryData(
      generateCheckCommitteePermissionsQueryOptions(event.id),
    );
    if (!permissions.canManageProjectCategories) {
      throw redirect({ to: "/$slug/committee/project-categories", params });
    }
  },
  loader: async ({ context }) => {
    const event = context.activeEvent;
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadProjectCategoriesQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateCheckCommitteePermissionsQueryOptions(event.id)),
    ]);
  },
  component: CreateProjectCategoryPage,
});

function CreateProjectCategoryPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const { activeEvent: event } = Route.useRouteContext();

  const handleClose = async () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      await navigate({ to: "..", replace: true });
    }
  };

  return (
    <CreateProjectCategoryDialog eventId={event.id} defaultOpen={true} onClose={handleClose} />
  );
}
