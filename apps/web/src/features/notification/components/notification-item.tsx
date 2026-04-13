import type { MouseEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, linkOptions } from "@tanstack/react-router";
import { CheckCircleIcon, RotateCcwIcon, SendIcon, XCircleIcon } from "lucide-react";
import { css } from "@akabase/styled-system/css";
import { Stack } from "@akabase/styled-system/jsx";
import { Text } from "@akabase/ui/components/text";
import type { NotificationListItem } from "@akabase/application/query/notification/list-notifications";
import type { SubmissionActionType } from "@akabase/domain/project/schema";
import { useMarkAsReadMutationOption } from "../actions/mutations";

const ACTION_ICONS: Record<SubmissionActionType, typeof SendIcon> = {
  submitted: SendIcon,
  approved: CheckCircleIcon,
  returned: RotateCcwIcon,
  withdrawn: XCircleIcon,
};

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "たった今";
  }
  if (minutes < 60) {
    return `${String(minutes)}分前`;
  }
  if (hours < 24) {
    return `${String(hours)}時間前`;
  }
  if (days < 30) {
    return `${String(days)}日前`;
  }
  return date.toLocaleDateString("ja-JP");
}

function getNotificationLink(notification: NotificationListItem, slug: string) {
  const { type, submissionId, orgId, projectId } = notification;

  if (submissionId === null) {
    return null;
  }

  switch (type) {
    case "submitted":
    case "withdrawn":
      return linkOptions({
        to: "/$slug/committee/submissions/$submissionId",
        params: { slug, submissionId },
      });
    case "approved":
    case "returned":
      if (orgId === null || projectId === null) {
        return null;
      }
      return linkOptions({
        to: "/$slug/orgs/$orgId/projects/$projectId/submissions/$submissionId",
        params: { slug, orgId, projectId, submissionId },
      });
    default:
      return null;
  }
}

const itemStyle = css({
  display: "flex",
  gap: "3",
  padding: "3",
  width: "full",
  textAlign: "left",
  borderRadius: "md",
  transition: "background-color 0.15s",
  position: "relative",
  textDecoration: "none",
  color: "inherit",
});

type NotificationItemProps = {
  notification: NotificationListItem;
  eventId: string;
  slug: string;
  onNavigate: () => void;
};

export function NotificationItem({
  notification,
  eventId,
  slug,
  onNavigate,
}: NotificationItemProps) {
  const markAsRead = useMutation(useMarkAsReadMutationOption());
  const Icon = ACTION_ICONS[notification.type];
  const isUnread = notification.readAt === null;
  const link = getNotificationLink(notification, slug);

  const handleMarkAsRead = () => {
    if (isUnread && !markAsRead.isPending) {
      markAsRead.mutate({
        data: { notificationId: notification.id, eventId },
      });
    }
  };

  const handleLinkClick = (e: MouseEvent) => {
    handleMarkAsRead();
    if (!e.metaKey && !e.ctrlKey) {
      onNavigate();
    }
  };

  const content = (
    <>
      <Icon
        className={css({
          flexShrink: "0",
          width: "5",
          height: "5",
          marginTop: "0.5",
          color: isUnread ? "fg.default" : "fg.muted",
        })}
      />
      <Stack gap="1" flex="1" minWidth="0">
        <Text textStyle="sm" fontWeight={isUnread ? "semibold" : "normal"} truncate>
          {notification.title}
        </Text>
        <Text textStyle="xs" color="fg.muted" lineClamp={2}>
          {notification.message}
        </Text>
        <Text textStyle="2xs" color="fg.subtle">
          {formatRelativeTime(notification.createdAt)}
        </Text>
      </Stack>
      {isUnread && (
        <span
          className={css({
            position: "absolute",
            top: "3",
            right: "3",
            width: "2",
            height: "2",
            borderRadius: "full",
            backgroundColor: "blue.500",
          })}
        />
      )}
    </>
  );

  if (link !== null) {
    return (
      <Link
        {...link}
        onClick={handleLinkClick}
        className={`${itemStyle} ${css({
          cursor: "pointer",
          backgroundColor: isUnread ? "bg.subtle" : "transparent",
          _hover: { backgroundColor: "bg.muted" },
        })}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`${itemStyle} ${css({
        cursor: isUnread ? "pointer" : "default",
        backgroundColor: isUnread ? "bg.subtle" : "transparent",
        _hover: isUnread ? { backgroundColor: "bg.muted" } : {},
        border: "none",
      })}`}
      onClick={handleMarkAsRead}
      disabled={!isUnread}
    >
      <span className={css({ srOnly: true })}>{isUnread ? "既読にする:" : "既読済み:"}</span>
      {content}
    </button>
  );
}
