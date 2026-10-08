import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Container, Stack } from "@akabase/styled-system/jsx";
import { Button } from "@akabase/ui/components/button";
import { Fieldset } from "@akabase/ui/components/fieldset";
import { Heading } from "@akabase/ui/components/heading";
import { Tabs } from "@akabase/ui/components/tabs";
import { ArrowLeftIcon, Trash2Icon } from "lucide-react";
import {
  generateLoadProjectDetailQueryOptions,
  generateLoadProjectPublishedQueryOptions,
} from "@/features/project/actions/queries";
import { ProjectBasicInfoForm } from "@/features/project/components/project-basic-info-form";
import { ProjectPublishedDataForm } from "@/features/project/components/project-published-data-form";
import { DeleteProjectDialog } from "@/features/project/components/delete-project-dialog";
import { generateLoadTagsQueryOptions } from "@/features/event/actions/queries/tag";
import { generateLoadPlacesQueryOptions } from "@/features/event/actions/queries/place";
import { generateLoadEventSettingsQueryOptions } from "@/features/event/actions/queries/event-settings";
import { generateCheckCommitteePermissionsQueryOptions } from "@/features/authorization/actions/queries";
import { handleNotFoundError } from "@/libs/error";
import { cast } from "@akabase/domain/shared/ids";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { ProjectId } from "@akabase/domain/project/schema";

export const Route = createFileRoute(
  "/_authenticated/$slug/committee/organizations_/$orgId_/projects/$projectId",
)({
  loader: async ({ params, context }) => {
    const event = context.activeEvent;
    await Promise.all([
      context.queryClient.ensureQueryData(
        generateLoadProjectDetailQueryOptions(event.id, params.orgId, params.projectId),
      ),
      context.queryClient.ensureQueryData(
        generateLoadProjectPublishedQueryOptions(event.id, params.orgId, params.projectId),
      ),
      context.queryClient.ensureQueryData(generateLoadPlacesQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateLoadTagsQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateLoadEventSettingsQueryOptions(event.id)),
      context.queryClient.ensureQueryData(generateCheckCommitteePermissionsQueryOptions(event.id)),
    ]);
  },
  component: CommitteeProjectEditPage,
  onError: handleNotFoundError,
});

function CommitteeProjectEditPage() {
  const { slug, orgId, projectId } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();
  const { data: project } = useSuspenseQuery(
    generateLoadProjectDetailQueryOptions(event.id, orgId, projectId),
  );
  const { data: permissions } = useSuspenseQuery(
    generateCheckCommitteePermissionsQueryOptions(event.id),
  );

  return (
    <Container maxW="4xl" py="8">
      <Stack gap="8">
        <div>
          <Button variant="plain" size="sm" mb="4" asChild>
            <Link to="/$slug/committee/organizations/$orgId/projects" params={{ slug, orgId }}>
              <ArrowLeftIcon />
              企画一覧に戻る
            </Link>
          </Button>
          <Heading as="h1" textStyle="2xl" fontWeight="bold">
            企画を編集
          </Heading>
        </div>

        <Tabs.Root defaultValue="basic">
          <Tabs.List>
            <Tabs.Trigger value="basic">基本情報</Tabs.Trigger>
            <Tabs.Trigger value="published">公開用データ</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>

          {/* 基本情報タブ */}
          <Tabs.Content value="basic">
            <ProjectBasicInfoForm projectId={projectId} eventId={event.id} orgId={orgId} />
          </Tabs.Content>

          {/* 公開用データタブ */}
          <Tabs.Content value="published">
            <ProjectPublishedDataForm projectId={projectId} eventId={event.id} orgId={orgId} />
          </Tabs.Content>
        </Tabs.Root>

        {permissions.canDeleteProject && (
          <DeleteProjectSection
            eventId={cast<EventId>(event.id)}
            orgId={cast<OrgId>(orgId)}
            projectId={project.id}
            projectName={project.name}
            slug={slug}
          />
        )}
      </Stack>
    </Container>
  );
}

function DeleteProjectSection({
  eventId,
  orgId,
  projectId,
  projectName,
  slug,
}: {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
  projectName: string;
  slug: string;
}) {
  return (
    <Fieldset.Root>
      <Fieldset.Control>
        <Fieldset.Legend>企画の削除</Fieldset.Legend>
        <Fieldset.HelperText>
          この企画を削除すると、下書き・提出履歴・公開用データもすべて削除されます。この操作は取り消せません。
        </Fieldset.HelperText>
      </Fieldset.Control>
      <Fieldset.Content>
        <DeleteProjectDialog
          eventId={eventId}
          orgId={orgId}
          projectId={projectId}
          projectName={projectName}
          slug={slug}
        >
          <Button variant="outline" colorPalette="red" w="fit" ml="auto">
            <Trash2Icon />
            企画を削除
          </Button>
        </DeleteProjectDialog>
      </Fieldset.Content>
    </Fieldset.Root>
  );
}
