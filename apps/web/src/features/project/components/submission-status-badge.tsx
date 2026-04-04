import { AlertCircleIcon, CheckCircleIcon, MinusCircleIcon, XCircleIcon } from "lucide-react";
import { Badge } from "@akabase/ui/components/badge";

export function SubmissionStatusBadge({
  status,
}: {
  status: "submitted" | "approved" | "returned" | "withdrawn";
}) {
  const statusConfig = {
    submitted: {
      label: "提出",
      icon: AlertCircleIcon,
    },
    approved: {
      label: "承認",
      icon: CheckCircleIcon,
    },
    returned: {
      label: "差戻",
      icon: XCircleIcon,
    },
    withdrawn: {
      label: "取下",
      icon: MinusCircleIcon,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      data-status={status}
      css={{
        "&[data-status='approved']": {
          colorPalette: "green",
        },
        "&[data-status='returned']": {
          colorPalette: "red",
        },
        "&[data-status='withdrawn']": {
          colorPalette: "gray",
        },
      }}
      variant="subtle"
      size="lg"
    >
      <Icon />
      {config.label}
    </Badge>
  );
}
