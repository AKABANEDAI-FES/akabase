import { Alert } from "@akabase/ui/components/alert";

type EventStatusAlertProps = {
  status: "active" | "archived";
};

/**
 * Event status alert component
 * Shows a warning alert when event is archived
 */
export function EventStatusAlert({ status }: EventStatusAlertProps) {
  if (status !== "archived") {
    return null;
  }

  return (
    <Alert.Root status="warning">
      <Alert.Content>
        <Alert.Title>このイベントはアーカイブされています</Alert.Title>
        <Alert.Description>
          アーカイブされたイベントは編集できません。編集するには先にアクティブ化してください。
        </Alert.Description>
      </Alert.Content>
    </Alert.Root>
  );
}
