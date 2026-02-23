import { useTransition } from "react";
import { Result } from "@praha/byethrow";
import {
  activateEventFn,
  archiveEventFn,
  generateLoadEventDetailCacheKey,
  generateLoadEventsCacheKey,
} from "@/features/event/actions";
import { Button, Fieldset, toaster } from "@/components/ui";
import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface EventStatusControlsProps {
  eventId: string;
  eventName: string;
  status: "active" | "archived";
}

/**
 * Event status controls component
 * Provides archive/activate buttons with loading state and error handling
 */
export function EventStatusControls({ eventId, eventName, status }: EventStatusControlsProps) {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const isArchived = status === "archived";

  const handleToggleArchive = () => {
    startTransition(async () => {
      try {
        const f = isArchived ? activateEventFn : archiveEventFn;
        const result = await f({ data: { eventId } });

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
        // Invalidate event detail and event list queries
        queryClient.invalidateQueries({ queryKey: generateLoadEventDetailCacheKey(eventId) });
        queryClient.invalidateQueries({ queryKey: generateLoadEventsCacheKey() });
      } catch (error) {
        toaster.create({
          type: "error",
          title: "エラー",
          description: "予期しないエラーが発生しました",
        });
      }
    });
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
