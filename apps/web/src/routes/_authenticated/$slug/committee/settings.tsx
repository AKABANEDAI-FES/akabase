import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Heading } from "@akabase/ui/components/heading";
import { Container, Stack } from "@akabase/styled-system/jsx";
import { generateLoadEventSettingsQueryOptions } from "@/features/event/actions/queries/event-settings";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions/queries";
import { EventSettingsForm } from "@/features/event/components/event-settings-form";

export const Route = createFileRoute("/_authenticated/$slug/committee/settings")({
  loader: async ({ context }) => {
    const event = context.activeEvent;
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadEventSettingsQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateCheckCommitteePermissionsQueryOptions(event.id)),
    ]);
  },
  component: EventSettingsPage,
});

function EventSettingsPage() {
  const { activeEvent: event } = Route.useRouteContext();
  const { data: settings } = useSuspenseQuery(generateLoadEventSettingsQueryOptions(event.id));
  const { data: permissions } = useSuspenseQuery(
    generateCheckCommitteePermissionsQueryOptions(event.id),
  );

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <Heading as="h1" textStyle="2xl" fontWeight="bold">
          イベント詳細設定
        </Heading>

        <EventSettingsForm
          settings={settings}
          disabled={!permissions.canManageEventSettings || event.status === "archived"}
        />
      </Stack>
    </Container>
  );
}
