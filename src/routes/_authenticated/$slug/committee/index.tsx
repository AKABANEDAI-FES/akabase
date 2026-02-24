import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button, Heading } from "@/components/ui";
import { Box, Container, Grid, Stack } from "styled-system/jsx";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions/queries";
import { generateCheckIsCommitteeAdminQueryOptions } from "@/features/authorization/actions";
import { Building2Icon, CalendarClockIcon, MapPinIcon, TagIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/$slug/committee/")({
  loader: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    await context.queryClient.ensureQueryData(generateCheckIsCommitteeAdminQueryOptions(event.id));
  },
  component: CommitteeIndexPage,
});

function CommitteeIndexPage() {
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));
  const { data: authCheck } = useSuspenseQuery(generateCheckIsCommitteeAdminQueryOptions(event.id));

  if (!authCheck.isCommitteeAdmin) {
    return (
      <Container maxW="6xl" py="8">
        <Stack gap="6">
          <Heading as="h1" textStyle="2xl" fontWeight="bold">
            委員会管理
          </Heading>
          <p>委員会管理機能は委員会管理者のみが利用できます。</p>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="8">
        <Heading as="h1" textStyle="2xl" fontWeight="bold">
          委員会管理 - {event.name}
        </Heading>

        <Box>
          <Heading as="h2" textStyle="xl" fontWeight="semibold" mb="4">
            団体・企画管理
          </Heading>
          <Grid columns={{ base: 1, md: 2 }} gap="4">
            <Link to="/$slug/committee/organizations" params={{ slug }}>
              <Button width="full" size="lg" variant="outline">
                <Building2Icon />
                団体管理
              </Button>
            </Link>
          </Grid>
        </Box>

        <Box>
          <Heading as="h2" textStyle="xl" fontWeight="semibold" mb="4">
            イベント設定
          </Heading>
          <Grid columns={{ base: 1, md: 3 }} gap="4">
            <Link to="/$slug/committee/tags" params={{ slug }}>
              <Button width="full" size="lg" variant="outline">
                <TagIcon />
                タグ管理
              </Button>
            </Link>
            <Link to="/$slug/committee/places" params={{ slug }}>
              <Button width="full" size="lg" variant="outline">
                <MapPinIcon />
                場所管理
              </Button>
            </Link>
            <Link to="/$slug/committee/deadlines" params={{ slug }}>
              <Button width="full" size="lg" variant="outline">
                <CalendarClockIcon />
                締切管理
              </Button>
            </Link>
          </Grid>
        </Box>
      </Stack>
    </Container>
  );
}
