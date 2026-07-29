import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { generateLoadEventsQueryOptions } from "@/features/event/actions/queries";
import { CreateApiKeyDialog } from "@/features/api-key/components/create-api-key-dialog";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/admin/api-keys/new")({
  component: CreateApiKeyPage,
});

function CreateApiKeyPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const { data: events } = useSuspenseQuery(generateLoadEventsQueryOptions());

  const handleClose = async () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      await navigate({ to: "..", replace: true });
    }
  };

  return <CreateApiKeyDialog events={events} defaultOpen={true} onClose={handleClose} />;
}
