import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CreateEventDialog } from "@/features/event/components";

export const Route = createFileRoute("/admin/events/new")({
  component: CreateEventPage,
});

function CreateEventPage() {
  const navigate = useNavigate();

  return <CreateEventDialog defaultOpen={true} onClose={() => navigate({ to: "/admin/events" })} />;
}
