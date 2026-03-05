import { Result } from "@praha/byethrow";
import { createListCollection } from "@ark-ui/react/collection";
import { useUpdateOrganizationMemberRoleMutation } from "@/features/organization/actions/mutations";
import { Select, toaster } from "@/components/ui";
import { ORG_ROLES, ORG_ROLE_LABELS } from "@/domain/authorization/schema";
import type { OrgMemberRole } from "@/domain/organization/schema";
import type { EventId, OrgId, UserId } from "@/domain/shared/ids";

const roleCollection = createListCollection({
  items: ORG_ROLES.map((role) => ({
    label: ORG_ROLE_LABELS[role],
    value: role,
  })),
});

interface OrgMemberRoleSelectProps {
  eventId: EventId;
  orgId: OrgId;
  userId: UserId;
  currentRole: OrgMemberRole;
}

export function OrgMemberRoleSelect({
  eventId,
  orgId,
  userId,
  currentRole,
}: OrgMemberRoleSelectProps) {
  const { mutateAsync, isPending } = useUpdateOrganizationMemberRoleMutation();

  const handleRoleChange = async (newRole: OrgMemberRole) => {
    if (newRole === currentRole) return;

    try {
      const result = await mutateAsync({
        data: { eventId, orgId, userId, role: newRole },
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
          handleRoleChange(selectedItem.value as OrgMemberRole);
        }
      }}
      disabled={isPending}
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
