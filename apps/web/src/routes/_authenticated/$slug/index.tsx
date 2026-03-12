import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ActivityIcon,
  ArrowRightIcon,
  Building2Icon,
  CalendarClockIcon,
  ClipboardListIcon,
  FileTextIcon,
} from "lucide-react";
import { Format } from "@ark-ui/react/format";
import { Badge } from "@archive/ui/components/badge";
import { Button } from "@archive/ui/components/button";
import { Card } from "@archive/ui/components/card";
import { Heading } from "@archive/ui/components/heading";
import { Skeleton } from "@archive/ui/components/skeleton";
import { Text } from "@archive/ui/components/text";
import { css } from "@archive/styled-system/css";
import { Container, Flex, Grid, HStack, Stack } from "@archive/styled-system/jsx";
import { SubmissionStatusBadge } from "@/features/project/components/submission-status-badge";
import { generateCheckCommitteeRoleQueryOptions } from "@/features/authorization/actions/queries";
import { generateLoadDeadlinesQueryOptions } from "@/features/event/actions/queries/deadline";
import {
  generateLoadProjectsQueryOptions,
  generateLoadRecentActivitiesQueryOptions,
  generateLoadSubmissionStatsQueryOptions,
} from "@/features/project/actions/queries";
import { generateLoadMyOrganizationsQueryOptions } from "@/features/organization/actions/queries";
import { DEADLINE_FIELD_LABELS } from "@archive/domain/event/schema";
import { Suspense } from "react";
import type { SubmissionStatus } from "@archive/domain/project/schema";
import { FormatDate } from "@/libs/date";

export const Route = createFileRoute("/_authenticated/$slug/")({
  loader: async ({ context }) => {
    const eventId = context.activeEvent.id;

    const { committeeRole } = await context.queryClient.ensureQueryData(
      generateCheckCommitteeRoleQueryOptions(eventId),
    );

    const isCommitteeMember = committeeRole !== "default";

    await Promise.all([
      context.queryClient.ensureQueryData(generateLoadDeadlinesQueryOptions(eventId)),
      context.queryClient.ensureQueryData(generateLoadMyOrganizationsQueryOptions(eventId)),
      context.queryClient.ensureQueryData(generateLoadRecentActivitiesQueryOptions(eventId)),
      ...(isCommitteeMember
        ? [context.queryClient.ensureQueryData(generateLoadSubmissionStatsQueryOptions(eventId))]
        : []),
    ]);
  },
  component: SlugHomePage,
});

// --- Helper ---

function getDaysRemaining(date: Date): number {
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// --- Components ---

function SlugHomePage() {
  const { slug } = Route.useParams();
  const { activeEvent: event } = Route.useRouteContext();

  const {
    data: { committeeRole },
  } = useSuspenseQuery(generateCheckCommitteeRoleQueryOptions(event.id));

  const isCommitteeMember = committeeRole !== "default";

  return (
    <Container maxW="6xl" py="12">
      <Stack gap="12">
        <Heading as="h1" textStyle="2xl" fontWeight="bold">
          {event.name}
        </Heading>

        {isCommitteeMember && <CommitteeSection slug={slug} eventId={event.id} />}

        <DeadlineSection eventId={event.id} />

        <RecentActivitySection slug={slug} eventId={event.id} />

        <MyOrganizationsSection slug={slug} eventId={event.id} />
      </Stack>
    </Container>
  );
}

function SectionLayout({
  children,
  title,
  icon,
  action,
}: {
  children: React.ReactNode;
  title: React.ReactNode;
  icon: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Stack gap="4">
      <Flex justify="space-between" align="center">
        <Heading as="h2" textStyle="lg" fontWeight="semibold">
          <HStack gap="2" _icon={{ boxSize: "1em" }}>
            {icon}
            {title}
          </HStack>
        </Heading>
        {action}
      </Flex>
      {children}
    </Stack>
  );
}

function CommitteeSection({ slug, eventId }: { slug: string; eventId: string }) {
  const { data: stats } = useSuspenseQuery(generateLoadSubmissionStatsQueryOptions(eventId));

  return (
    <SectionLayout
      title="提出状況"
      icon={<ClipboardListIcon />}
      action={
        <Button variant="plain" size="sm" asChild>
          <Link to="/$slug/committee/submissions" params={{ slug }}>
            一覧を見る
            <ArrowRightIcon />
          </Link>
        </Button>
      }
    >
      <Grid columns={{ base: 2, md: 4 }} gap="4">
        <StatCard slug={slug} status="submitted" label="未審査" value={stats.submitted} />
        <StatCard slug={slug} status="approved" label="承認済" value={stats.approved} />
        <StatCard slug={slug} status="returned" label="差戻し" value={stats.returned} />
        <StatCard slug={slug} status="withdrawn" label="取下げ" value={stats.withdrawn} />
      </Grid>
    </SectionLayout>
  );
}

function StatCard({
  slug,
  status,
  label,
  value,
}: {
  slug: string;
  status: SubmissionStatus;
  label: string;
  value: number;
}) {
  return (
    <Card.Root>
      <Link to="/$slug/committee/submissions" params={{ slug }} search={{ status: [status] }}>
        <Card.Header>
          <Card.Description>{label}</Card.Description>
        </Card.Header>
        <Card.Body>
          <Text textStyle="2xl" fontWeight="bold">
            {value}
          </Text>
        </Card.Body>
      </Link>
    </Card.Root>
  );
}

function DeadlineSection({ eventId }: { eventId: string }) {
  const { data: deadlines } = useSuspenseQuery(generateLoadDeadlinesQueryOptions(eventId));

  const sorted = [...deadlines].toSorted((a, b) => a.deadlineAt.getTime() - b.deadlineAt.getTime());

  return (
    <SectionLayout title="締切" icon={<CalendarClockIcon />}>
      {sorted.length === 0 ? (
        <Text color="fg.muted">締切は設定されていません。</Text>
      ) : (
        <Card.Root>
          <Card.Body>
            <Stack gap="3">
              {sorted.map((deadline) => {
                const days = getDaysRemaining(deadline.deadlineAt);
                const isUrgent = days >= 0 && days <= 3;
                const isPast = days < 0;

                return (
                  <Flex key={deadline.id} justify="space-between" align="center" gap="4">
                    <Stack gap="0.5">
                      <Text textStyle="sm" fontWeight="medium">
                        {DEADLINE_FIELD_LABELS[deadline.fieldKey] ?? deadline.fieldKey}
                      </Text>
                      <Text textStyle="xs" color="fg.muted">
                        <FormatDate
                          value={deadline.deadlineAt}
                          option={{
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }}
                        />
                      </Text>
                    </Stack>
                    {isPast ? (
                      <Badge variant="subtle" colorPalette="gray">
                        締切済
                      </Badge>
                    ) : isUrgent ? (
                      <Badge variant="subtle" colorPalette="red">
                        残り{days}日
                      </Badge>
                    ) : (
                      <Badge variant="subtle">残り{days}日</Badge>
                    )}
                  </Flex>
                );
              })}
            </Stack>
          </Card.Body>
        </Card.Root>
      )}
    </SectionLayout>
  );
}

function RecentActivitySection({ slug, eventId }: { slug: string; eventId: string }) {
  const { data: activities } = useSuspenseQuery(generateLoadRecentActivitiesQueryOptions(eventId));

  return (
    <SectionLayout title="最近のアクティビティ" icon={<ActivityIcon />}>
      {activities.length === 0 ? (
        <Text color="fg.muted">最近のアクティビティはありません。</Text>
      ) : (
        <Card.Root>
          <Card.Body>
            <Stack gap="3">
              {activities.map((activity) => (
                <Link
                  key={activity.actionId}
                  to="/$slug/orgs/$orgId/projects/$projectId/submissions/$submissionId"
                  params={{
                    slug,
                    orgId: activity.orgId,
                    projectId: activity.projectId,
                    submissionId: activity.submissionId,
                  }}
                  className={css({
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "4",
                    textDecoration: "none",
                  })}
                >
                  <Stack gap="0.5" minW="0">
                    <HStack gap="2">
                      <SubmissionStatusBadge status={activity.actionType} />
                      <Text textStyle="sm" fontWeight="medium" truncate>
                        {activity.projectName}
                      </Text>
                    </HStack>
                    <Text textStyle="xs" color="fg.muted">
                      {activity.orgName} - {activity.actionByUserName}
                    </Text>
                  </Stack>
                  <Text textStyle="xs" color="fg.muted" flexShrink={0}>
                    <Format.RelativeTime value={activity.actionAt} style="short" />
                  </Text>
                </Link>
              ))}
            </Stack>
          </Card.Body>
        </Card.Root>
      )}
    </SectionLayout>
  );
}

function MyOrganizationsSection({ slug, eventId }: { slug: string; eventId: string }) {
  const { data: organizations } = useSuspenseQuery(
    generateLoadMyOrganizationsQueryOptions(eventId),
  );

  if (organizations.length === 0) {
    return (
      <SectionLayout title="所属団体" icon={<Building2Icon />}>
        <Text>現在、所属している団体はありません。</Text>
      </SectionLayout>
    );
  }

  return (
    <SectionLayout title="所属団体" icon={<Building2Icon />}>
      <Stack gap="4">
        {organizations.map((org) => (
          <Card.Root key={org.id}>
            <Card.Header>
              <Flex justify="space-between" align="center">
                <Card.Title>{org.name}</Card.Title>
                <Button variant="plain" size="sm" asChild>
                  <Link to="/$slug/orgs/$orgId" params={{ slug, orgId: org.id }}>
                    詳細
                    <ArrowRightIcon />
                  </Link>
                </Button>
              </Flex>
            </Card.Header>
            <Card.Body>
              <Suspense fallback={<ProjectListSkeleton />}>
                <ProjectList slug={slug} eventId={eventId} orgId={org.id} />
              </Suspense>
            </Card.Body>
          </Card.Root>
        ))}
      </Stack>
    </SectionLayout>
  );
}

function ProjectList({ slug, eventId, orgId }: { slug: string; eventId: string; orgId: string }) {
  const { data: projects } = useSuspenseQuery(generateLoadProjectsQueryOptions(eventId, orgId));

  if (projects.length === 0) {
    return (
      <Text textStyle="sm" color="fg.muted">
        企画はまだ登録されていません。
      </Text>
    );
  }

  return (
    <Stack gap="4">
      {projects.map((project) => (
        <Link
          key={project.id}
          to="/$slug/orgs/$orgId/projects/$projectId"
          params={{ slug, orgId, projectId: project.id }}
          className={css({
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            textDecoration: "none",
          })}
        >
          <HStack gap="2">
            <FileTextIcon
              className={css({
                color: "fg.muted",
                width: "4",
                height: "4",
                flexShrink: 0,
              })}
            />
            <Text textStyle="sm">{project.name}</Text>
          </HStack>
          {project.latestSubmissionStatus ? (
            <SubmissionStatusBadge status={project.latestSubmissionStatus} />
          ) : (
            <Badge variant="subtle" colorPalette="gray">
              未提出
            </Badge>
          )}
        </Link>
      ))}
    </Stack>
  );
}

function ProjectListSkeleton() {
  return (
    <Stack gap="4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} h="5" />
      ))}
    </Stack>
  );
}
