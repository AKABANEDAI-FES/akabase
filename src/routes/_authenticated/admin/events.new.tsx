import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { CreateEventDialog } from "@/features/event/components";

export const Route = createFileRoute("/_authenticated/admin/events/new")({
  component: CreateEventPage,
});

function CreateEventPage() {
  const router = useRouter();
  const navigate = useNavigate();

  const handleClose = () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      navigate({ to: "..", replace: true });
    }
  };

  return <CreateEventDialog defaultOpen={true} onClose={handleClose} />;
}
