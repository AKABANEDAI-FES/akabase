import { Result } from "@praha/byethrow";
import { createListCollection } from "@ark-ui/react/collection";
import { useUpdateCommitteeRoleMutation } from "@/features/user/actions";
import { Select, toaster } from "@/components/ui";
import { COMMITTEE_ROLES, COMMITTEE_ROLE_LABELS } from "@/domain/authorization/schema";
import type { CommitteeRole } from "@/domain/authorization/schema";

const roleCollection = createListCollection({
  items: COMMITTEE_ROLES.map((role) => ({
    label: COMMITTEE_ROLE_LABELS[role],
    value: role,
  })),
});

interface CommitteeRoleSelectProps {
  userId: string;
  eventId: string;
  currentRole: CommitteeRole;
  disabled?: boolean;
}

export function CommitteeRoleSelect({
  userId,
  eventId,
  currentRole,
  disabled,
}: CommitteeRoleSelectProps) {
  const { mutateAsync, isPending } = useUpdateCommitteeRoleMutation();

  const handleRoleChange = async (newRole: CommitteeRole) => {
    if (newRole === currentRole) return;

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
      onValueChange={({ value }) => {
        const selectedItem = roleCollection.items.find((item) => item.value === value[0]);
        if (selectedItem) {
          handleRoleChange(selectedItem.value);
        }
      }}
      disabled={disabled || isPending}
      size="sm"
      positioning={{ sameWidth: true }}
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
