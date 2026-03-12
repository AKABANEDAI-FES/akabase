import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Stack } from "@archive/styled-system/jsx";
import { Text } from "@archive/ui/components/text";
import { css } from "@archive/styled-system/css";
import { generateLoadProjectsQueryOptions } from "@/features/project/actions/queries";
import type { EventId } from "@archive/domain/event/schema";
import type { OrgId } from "@archive/domain/organization/schema";
import { FormatDate } from "@/libs/date";

type OrgProjectsListProps = {
  eventId: EventId;
  orgId: OrgId;
  slug: string;
};

export function OrgProjectsList({ eventId, orgId, slug }: OrgProjectsListProps) {
  const { data: projects } = useSuspenseQuery(generateLoadProjectsQueryOptions(eventId, orgId));

  if (projects.length === 0) {
    return <Text>企画がまだありません。新しい企画を作成してください。</Text>;
  }

  return (
    <Stack gap="0" divideY="1" borderYWidth="1">
      {projects.map((project) => (
        <Link
          key={project.id}
          to="/$slug/orgs/$orgId/projects/$projectId"
          params={{ slug, orgId, projectId: project.id }}
          className={css({
            display: "grid",
            gap: "2",
            py: "4",
            _hover: { bg: "colorPalette.plain.bg.hover" },
            transitionProperty: "background",
            transitionDuration: "200ms",
          })}
        >
          <Text fontWeight="semibold" fontSize="lg">
            {project.name}
          </Text>
          <Text color="fg.muted" fontSize="sm">
            最終更新:{" "}
            <FormatDate
              value={project.updatedAt}
              option={{ dateStyle: "medium", timeStyle: "short" }}
            />
          </Text>
        </Link>
      ))}
    </Stack>
  );
}
