import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Portal } from "@ark-ui/react/portal";
import { BellIcon } from "lucide-react";
import { css } from "@akabase/styled-system/css";
import { IconButton } from "@akabase/ui/components/icon-button";
import { Popover } from "@akabase/ui/components/popover";
import { generateLoadUnreadCountQueryOptions } from "../actions/queries";
import { NotificationList } from "./notification-list";

type NotificationBellProps = {
  eventId: string;
  slug: string;
};

export function NotificationBell({ eventId, slug }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { data: unreadCount } = useQuery(generateLoadUnreadCountQueryOptions(eventId));

  return (
    <Popover.Root
      positioning={{ placement: "bottom-end" }}
      open={open}
      onOpenChange={({ open }) => setOpen(open)}
    >
      <Popover.Trigger asChild>
        <IconButton
          variant="plain"
          colorPalette="gray"
          size="md"
          aria-label="通知"
          className={css({ position: "relative" })}
        >
          <BellIcon />
          {unreadCount != null && unreadCount > 0 && (
            <span
              className={css({
                position: "absolute",
                top: "0",
                right: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "4.5",
                height: "4.5",
                borderRadius: "full",
                backgroundColor: "red.500",
                color: "white",
                textStyle: "2xs",
                fontWeight: "bold",
                paddingInline: "1",
              })}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content className={css({ width: "sm", overflow: "hidden" })}>
            <NotificationList eventId={eventId} slug={slug} onNavigate={() => setOpen(false)} />
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
