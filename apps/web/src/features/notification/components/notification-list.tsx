import { useMutation, useQuery } from "@tanstack/react-query";
import { css } from "@akabase/styled-system/css";
import { HStack, Stack } from "@akabase/styled-system/jsx";
import { Button } from "@akabase/ui/components/button";
import { Text } from "@akabase/ui/components/text";
import { Heading } from "@akabase/ui/components/heading";
import { Spinner } from "@akabase/ui/components/spinner";
import { ScrollArea } from "@akabase/ui/components/scroll-area";
import { generateLoadNotificationsQueryOptions } from "../actions/queries";
import { useMarkAllAsReadMutationOption } from "../actions/mutations";
import { NotificationItem } from "./notification-item";

type NotificationListProps = {
  eventId: string;
};

export function NotificationList({ eventId }: NotificationListProps) {
  const { data: notifications, isLoading } = useQuery(
    generateLoadNotificationsQueryOptions(eventId),
  );
  const markAllAsRead = useMutation(useMarkAllAsReadMutationOption());

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate({ data: { eventId } });
  };

  const hasUnread = notifications?.some((n) => n.readAt === null);

  return (
    <Stack gap="0">
      <HStack
        justify="space-between"
        padding="3"
        borderBottomWidth="1"
        borderColor="border.default"
        backgroundColor="bg.default"
      >
        <Heading as="h3" textStyle="sm">
          通知
        </Heading>
        {hasUnread && (
          <Button
            variant="plain"
            size="xs"
            onClick={handleMarkAllAsRead}
            loading={markAllAsRead.isPending}
          >
            すべて既読
          </Button>
        )}
      </HStack>

      {isLoading && (
        <Stack align="center" padding="8">
          <Spinner />
        </Stack>
      )}

      {!isLoading && notifications && notifications.length === 0 && (
        <Stack align="center" padding="8">
          <Text textStyle="sm" color="fg.muted">
            通知はありません
          </Text>
        </Stack>
      )}

      {!isLoading && notifications && notifications.length > 0 && (
        <ScrollArea.Root
          className={css({ maxHeight: "sm" })}
        >
          <ScrollArea.Viewport>
            <ScrollArea.Content>
              <Stack gap="0" padding="1">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    eventId={eventId}
                  />
                ))}
              </Stack>
            </ScrollArea.Content>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" />
        </ScrollArea.Root>
      )}
    </Stack>
  );
}
