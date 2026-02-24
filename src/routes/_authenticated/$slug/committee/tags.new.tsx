import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CreateTagDialog } from "@/features/event/components";
import { generateLoadEventBySlugQueryOptions } from "@/features/event/actions";
import { generateLoadTagsQueryOptions } from "@/features/event/actions/queries";

export const Route = createFileRoute("/_authenticated/$slug/committee/tags/new")({
  loader: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    await context.queryClient.ensureQueryData(generateLoadTagsQueryOptions(event.id));
  },
  component: CreateTagPage,
});

function CreateTagPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));

  const handleClose = () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      navigate({ to: "..", replace: true });
    }
  };

  return <CreateTagDialog eventId={event.id} defaultOpen={true} onClose={handleClose} />;
}
