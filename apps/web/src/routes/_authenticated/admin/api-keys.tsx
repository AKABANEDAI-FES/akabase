import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { Button } from "@akabase/ui/components/button";
import { Heading } from "@akabase/ui/components/heading";
import { Container, Flex, Stack } from "@akabase/styled-system/jsx";
import { PlusIcon } from "lucide-react";
import { generateLoadApiKeysQueryOptions } from "@/features/api-key/actions/queries";
import { generateLoadEventsQueryOptions } from "@/features/event/actions/queries";
import { ApiKeysTable } from "@/features/api-key/components/api-keys-table";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/admin/api-keys")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadApiKeysQueryOptions()),
      context.queryClient.ensureQueryData(generateLoadEventsQueryOptions()),
    ]);
  },
  component: ApiKeyListPage,
});

function ApiKeyListPage() {
  const { data: events } = useSuspenseQuery(generateLoadEventsQueryOptions());
  const { data: apiKeys } = useSuspenseQuery(generateLoadApiKeysQueryOptions());

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <Flex justify="space-between" align="center">
          <Heading as="h1" textStyle="2xl" fontWeight="bold">
            APIキー管理
          </Heading>
          <Link to="/admin/api-keys/new">
            <Button>
              <PlusIcon />
              APIキーを作成
            </Button>
          </Link>
        </Flex>

        {apiKeys.length === 0 ? (
          <p>APIキーがまだありません。新しいAPIキーを作成してください。</p>
        ) : (
          <ApiKeysTable apiKeys={apiKeys} events={events} />
        )}
      </Stack>
      <Outlet />
    </Container>
  );
}
