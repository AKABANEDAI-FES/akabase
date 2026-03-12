import { Result } from "@archive/result";
import { useMutation } from "@tanstack/react-query";
import {
  useActivateEventMutationOption,
  useArchiveEventMutationOption,
} from "../actions/mutations";
import { Button } from "@archive/ui/components/button";
import { Fieldset } from "@archive/ui/components/fieldset";
import { toaster } from "@archive/ui/components/toast";
import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";
import type { EventId } from "@archive/domain/event/schema";

type EventStatusControlsProps = {
  eventId: EventId;
  eventName: string;
  status: "active" | "archived";
};

/**
 * Event status controls component
 * Provides archive/activate buttons with loading state and error handling
 */
export function EventStatusControls({ eventId, eventName, status }: EventStatusControlsProps) {
  const { mutateAsync: archiveEvent, isPending: isArchiving } = useMutation(
    useArchiveEventMutationOption(),
  );
  const { mutateAsync: activateEvent, isPending: isActivating } = useMutation(
    useActivateEventMutationOption(),
  );

  const isArchived = status === "archived";
  const isPending = isArchiving || isActivating;

  const handleToggleArchive = async () => {
    try {
      const mutation = isArchived ? activateEvent : archiveEvent;
      const result = await mutation({ data: { eventId } });

      if (Result.isFailure(result)) {
        toaster.create({
          type: "error",
          title: "エラー",
          description: result.error.message,
        });
        return;
      }

      toaster.create({
        type: "success",
        title: isArchived ? "イベントをアクティブ化しました" : "イベントをアーカイブしました",
        description: isArchived
          ? `「${eventName}」が編集可能になりました`
          : `「${eventName}」は読み取り専用になりました`,
      });
    } catch (error) {
      console.error("Failed to toggle event status:", error);
      toaster.create({
        type: "error",
        title: "エラー",
        description: "予期しないエラーが発生しました",
      });
    }
  };

  return (
    <Fieldset.Root>
      <Fieldset.Control>
        <Fieldset.Legend>イベントステータス</Fieldset.Legend>
        <Fieldset.HelperText>
          {isArchived
            ? "アーカイブされたイベントは読み取り専用です"
            : "イベントをアーカイブすると編集できなくなります"}
        </Fieldset.HelperText>
      </Fieldset.Control>
      <Fieldset.Content>
        <Button
          variant="outline"
          colorPalette={isArchived ? undefined : "red"}
          onClick={handleToggleArchive}
          loading={isPending}
          w="fit"
          ml="auto"
        >
          {isArchived ? (
            <>
              <ArchiveRestoreIcon />
              アクティブ化
            </>
          ) : (
            <>
              <ArchiveIcon />
              アーカイブ
            </>
          )}
        </Button>
      </Fieldset.Content>
    </Fieldset.Root>
  );
}
