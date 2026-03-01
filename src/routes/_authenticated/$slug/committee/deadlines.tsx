import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button, Heading } from "@/components/ui";
import { Container, Flex, Stack } from "styled-system/jsx";
import { PlusIcon } from "lucide-react";
import { generateLoadDeadlinesQueryOptions } from "@/features/event/actions/queries";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions";
import { DeadlineManagementTable } from "@/features/event/components/deadline-management-table";

export const Route = createFileRoute("/_authenticated/$slug/committee/deadlines")({
  loader: async ({ context }) => {
    const event = context.activeEvent;
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadDeadlinesQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateCheckCommitteePermissionsQueryOptions(event.id)),
    ]);
  },
  component: DeadlinesManagementPage,
});

function DeadlinesManagementPage() {
  const { slug } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();
  const { data: deadlines } = useSuspenseQuery(generateLoadDeadlinesQueryOptions(event.id));
  const { data: permissions } = useSuspenseQuery(
    generateCheckCommitteePermissionsQueryOptions(event.id),
  );

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <Flex justify="space-between" align="center">
          <Heading as="h1" textStyle="2xl" fontWeight="bold">
            締切管理
          </Heading>
          {permissions.canManageDeadlines && (
            <Button asChild>
              <Link to="/$slug/committee/deadlines/new" params={{ slug }}>
                <PlusIcon />
                締切を追加
              </Link>
            </Button>
          )}
        </Flex>

        <DeadlineManagementTable
          deadlines={deadlines}
          eventId={event.id}
          canUpdate={permissions.canManageDeadlines}
          canDelete={permissions.canManageDeadlines}
        />
      </Stack>
      <Outlet />
    </Container>
  );
}
