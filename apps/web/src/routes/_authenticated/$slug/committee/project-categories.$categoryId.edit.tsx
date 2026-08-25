import {
  createFileRoute,
  notFound,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { generateLoadProjectCategoriesQueryOptions } from "@/features/event/actions/queries/project-category";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions/queries";
import { EditProjectCategoryDialog } from "@/features/event/components/edit-project-category-dialog";

export const Route = createFileRoute(
  "/_authenticated/$slug/committee/project-categories/$categoryId/edit",
)({
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
  component: EditProjectCategoryPage,
});

function EditProjectCategoryPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const { categoryId } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();
  const { data: categories } = useSuspenseQuery(
    generateLoadProjectCategoriesQueryOptions(event.id),
  );

  const category = categories.find((c) => c.id === categoryId);

  const handleClose = async () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      await navigate({
        to: "/$slug/committee/project-categories",
        params: { slug: event.slug },
        replace: true,
      });
    }
  };

  if (!category) {
    throw notFound();
  }

  return (
    <EditProjectCategoryDialog
      eventId={event.id}
      category={category}
      defaultOpen={true}
      onClose={handleClose}
    />
  );
}
