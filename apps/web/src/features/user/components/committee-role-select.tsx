import { Result } from "@archive/result";
import { createListCollection } from "@ark-ui/react/collection";
import { useTransition } from "react";
import { useMutation } from "@tanstack/react-query";
import { useUpdateCommitteeRoleMutationOption } from "../actions/mutations";
import { Select } from "@archive/ui/components/select";
import { toaster } from "@archive/ui/components/toast";
import { COMMITTEE_ROLES, COMMITTEE_ROLE_LABELS } from "@archive/domain/authorization/schema";
import type { CommitteeRole } from "@archive/domain/authorization/schema";
import type { EventId } from "@archive/domain/event/schema";
import type { UserId } from "@archive/domain/user/schema";

const roleCollection = createListCollection({
  items: COMMITTEE_ROLES.map((role) => ({
    label: COMMITTEE_ROLE_LABELS[role],
    value: role,
  })),
});

type CommitteeRoleSelectProps = {
  userId: UserId;
  eventId: EventId;
  currentRole: CommitteeRole;
  disabled?: boolean;
};

export function CommitteeRoleSelect({
  userId,
  eventId,
  currentRole,
  disabled,
}: CommitteeRoleSelectProps) {
  const { mutateAsync, isPending } = useMutation(useUpdateCommitteeRoleMutationOption());
  const [, startTransition] = useTransition();

  const handleRoleChange = async (newRole: CommitteeRole) => {
    if (newRole === currentRole) {
      return;
    }

    try {
      const result = await mutateAsync({
        data: { userId, eventId, role: newRole },
      });

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
        title: "ロールを更新しました",
      });
    } catch {
      toaster.create({
        type: "error",
        title: "エラー",
        description: "予期しないエラーが発生しました",
      });
    }
  };

  return (
    <Select.Root
      collection={roleCollection}
      value={[currentRole]}
      onValueChange={({ value: selectedValues }) => {
        const selectedItem = roleCollection.items.find((item) => item.value === selectedValues[0]);
        if (selectedItem) {
          startTransition(async () => {
            await handleRoleChange(selectedItem.value);
          });
        }
      }}
      disabled={disabled || isPending}
      size="sm"
      positioning={{ placement: "bottom-end" }}
    >
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText />
          <Select.Indicator />
        </Select.Trigger>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {roleCollection.items.map((option) => (
            <Select.Item key={option.value} item={option}>
              <Select.ItemText>{option.label}</Select.ItemText>
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  );
}
