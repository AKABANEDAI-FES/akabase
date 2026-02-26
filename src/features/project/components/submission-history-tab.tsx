import { useMemo } from "react";
import { Flex, Grid, HStack, Stack } from "styled-system/jsx";
import {
  CheckCircleIcon,
  CornerDownLeftIcon,
  HistoryIcon,
  MessageSquareIcon,
  MinusCircleIcon,
  UndoIcon,
} from "lucide-react";
import { Card, Text } from "@/components/ui";
import type { SubmissionDetail } from "@/application/query/project/get-submission-detail";
import { SUBMISSION_ACTION_LABELS } from "@/domain/project/schema";

interface SubmissionHistoryTabProps {
  submission: SubmissionDetail;
}

export function SubmissionHistoryTab({ submission }: SubmissionHistoryTabProps) {
  const allItems = useMemo(() => {
    const actionItems = submission.actions.map((action) => ({
      type: "action" as const,
      id: action.id,
      createdAt: action.createdAt,
      action,
      message: submission.messages.find((m) => m.actionId === action.id),
    }));

    const standaloneMessages = submission.messages
      .filter((m) => m.actionId === null)
      .map((message) => ({
        type: "message" as const,
        id: message.id,
        createdAt: message.createdAt,
        message,
      }));

    return [...actionItems, ...standaloneMessages].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }, [submission.actions, submission.messages]);

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>
          <HStack
            gap="2"
            _icon={{
              boxSize: "1em",
            }}
          >
            <HistoryIcon />
            履歴とフィードバック
          </HStack>
        </Card.Title>
      </Card.Header>
      <Card.Body>
        {allItems.length === 0 ? (
          <Text textStyle="sm" color="fg.muted">
            履歴はありません。
          </Text>
        ) : (
          <Stack gap="3">
            {allItems.map((item) =>
              item.type === "action" ? (
                <ActionHistoryItem key={item.id} action={item.action} message={item.message} />
              ) : (
                <StandaloneMessageItem key={item.id} message={item.message} />
              ),
            )}
          </Stack>
        )}
      </Card.Body>
    </Card.Root>
  );
}

function ActionHistoryItem({
  action,
  message,
}: {
  action: SubmissionDetail["actions"][number];
  message?: SubmissionDetail["messages"][number];
}) {
  return (
    <Flex gap="3" align="flex-start">
      <Grid
        textStyle="sm"
        h="1lh"
        placeContent="center"
        _icon={{
          boxSize: "1em",
          color: "colorPalette.default",
          "&[data-status='approved']": { colorPalette: "green" },
          "&[data-status='returned']": { colorPalette: "red" },
          "&[data-status='withdrawn']": { colorPalette: "gray" },
        }}
      >
        <ActionIcon actionType={action.actionType} />
      </Grid>
      <Stack gap="1" flex="1">
        <Flex justify="space-between" align="center">
          <Text textStyle="sm" fontWeight="medium">
            {SUBMISSION_ACTION_LABELS[action.actionType]}
          </Text>
          <Text textStyle="xs" color="fg.muted">
            {action.createdAt.toLocaleString("ja-JP")}
          </Text>
        </Flex>
        <Text textStyle="xs" color="fg.muted">
          {action.userName}
        </Text>
        {message && (
          <Card.Root variant="subtle" mt="1">
            <Card.Body py="2" px="3">
              <Text textStyle="xs" whiteSpace="pre-wrap">
                {message.message}
              </Text>
            </Card.Body>
          </Card.Root>
        )}
      </Stack>
    </Flex>
  );
}

function StandaloneMessageItem({ message }: { message: SubmissionDetail["messages"][number] }) {
  return (
    <Flex gap="3" align="flex-start">
      <Grid
        textStyle="sm"
        h="1lh"
        placeContent="center"
        _icon={{
          boxSize: "1em",
        }}
      >
        <MessageSquareIcon />
      </Grid>
      <Stack gap="1" flex="1">
        <Flex justify="space-between" align="center">
          <Text textStyle="sm" fontWeight="medium">
            コメント
          </Text>
          <Text textStyle="xs" color="fg.muted">
            {message.createdAt.toLocaleString("ja-JP")}
          </Text>
        </Flex>
        <Text textStyle="xs" color="fg.muted">
          {message.userName}
        </Text>
        <Card.Root variant="subtle" mt="1">
          <Card.Body py="2" px="3">
            <Text textStyle="xs" whiteSpace="pre-wrap">
              {message.message}
            </Text>
          </Card.Body>
        </Card.Root>
      </Stack>
    </Flex>
  );
}

function ActionIcon({ actionType }: { actionType: string }) {
  switch (actionType) {
    case "approved":
      return <CheckCircleIcon data-status="approved" />;
    case "returned":
      return <UndoIcon data-status="returned" />;
    case "withdrawn":
      return <MinusCircleIcon data-status="withdrawn" />;
    case "submitted":
      return <CornerDownLeftIcon data-status="submitted" />;
    default:
      return <HistoryIcon />;
  }
}
