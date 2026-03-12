import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { CreateEventDialog } from "@/features/event/components/create-event-dialog";

export const Route = createFileRoute("/_authenticated/admin/events/new")({
  component: CreateEventPage,
});

function CreateEventPage() {
  const router = useRouter();
  const navigate = useNavigate();

  const handleClose = async () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      await navigate({ to: "..", replace: true });
    }
  };

  return <CreateEventDialog defaultOpen={true} onClose={handleClose} />;
}
