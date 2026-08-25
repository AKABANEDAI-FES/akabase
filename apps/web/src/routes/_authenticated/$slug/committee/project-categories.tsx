import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@akabase/ui/components/button";
import { Heading } from "@akabase/ui/components/heading";
import { Container, Flex, Stack } from "@akabase/styled-system/jsx";
import { PlusIcon } from "lucide-react";
import { generateLoadProjectCategoriesQueryOptions } from "@/features/event/actions/queries/project-category";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions/queries";
import { ProjectCategoryManagementTable } from "@/features/event/components/project-category-management-table";

export const Route = createFileRoute("/_authenticated/$slug/committee/project-categories")({
  loader: async ({ context }) => {
    const event = context.activeEvent;
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadProjectCategoriesQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateCheckCommitteePermissionsQueryOptions(event.id)),
    ]);
  },
  component: ProjectCategoriesManagementPage,
});

function ProjectCategoriesManagementPage() {
  const { slug } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();
  const { data: categories } = useSuspenseQuery(
    generateLoadProjectCategoriesQueryOptions(event.id),
  );
  const { data: permissions } = useSuspenseQuery(
    generateCheckCommitteePermissionsQueryOptions(event.id),
  );

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <Flex justify="space-between" align="center">
          <Heading as="h1" textStyle="2xl" fontWeight="bold">
            企画区分管理
          </Heading>
          {permissions.canManageProjectCategories && (
            <Button asChild>
              <Link to="/$slug/committee/project-categories/new" params={{ slug }}>
                <PlusIcon />
                企画区分を追加
              </Link>
            </Button>
          )}
        </Flex>

        <ProjectCategoryManagementTable
          categories={categories}
          eventId={event.id}
          slug={slug}
          canUpdate={permissions.canManageProjectCategories}
          canDelete={permissions.canManageProjectCategories}
        />
      </Stack>
      <Outlet />
    </Container>
  );
}
