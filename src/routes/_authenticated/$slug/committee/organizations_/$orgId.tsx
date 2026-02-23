import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Container, Flex, Stack } from "styled-system/jsx";
import { Button, Heading } from "@/components/ui";
import { ArrowLeftIcon, FolderIcon } from "lucide-react";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions";
import { generateLoadOrganizationDetailQueryOptions } from "@/features/organization/actions";
import { UpdateOrganizationForm } from "@/features/organization/components/update-organization-form";

export const Route = createFileRoute("/_authenticated/$slug/committee/organizations_/$orgId")({
  loader: async ({ params, context }) => {
    // Pre-fetch both event and organization detail
    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadEventBySlugQueryOptions(params.slug)),
      context.queryClient.ensureQueryData(generateLoadOrganizationDetailQueryOptions(params.orgId)),
    ]);
  },
  component: EditOrganizationPage,
});

function EditOrganizationPage() {
  const { slug, orgId } = Route.useParams();
  const { data: organization } = useSuspenseQuery(
    generateLoadOrganizationDetailQueryOptions(orgId),
  );

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="12">
        <div>
          <Button variant="plain" size="sm" mb="4" asChild>
            <Link to="/$slug/committee/organizations" params={{ slug }}>
              <ArrowLeftIcon />
              団体一覧に戻る
            </Link>
          </Button>
          <Flex justify="space-between" align="center">
            <Heading as="h1" textStyle="2xl" fontWeight="bold">
              団体を編集
            </Heading>
            <Button asChild>
              <Link to="/$slug/committee/organizations/$orgId/projects" params={{ slug, orgId }}>
                <FolderIcon />
                企画を管理
              </Link>
            </Button>
          </Flex>
        </div>

        <UpdateOrganizationForm organization={organization} />
      </Stack>
    </Container>
  );
}
