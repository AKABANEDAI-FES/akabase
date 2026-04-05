import { Result } from "@akabase/result";
import { createListCollection } from "@ark-ui/react/collection";
import { useMutation } from "@tanstack/react-query";
import { useUpdateOrganizationMemberRoleMutationOption } from "../actions/mutations/member";
import { Select } from "@akabase/ui/components/select";
import { toaster } from "@akabase/ui/components/toast";
import { ORG_ROLES, ORG_ROLE_LABELS } from "@akabase/domain/authorization/roles";
import type { OrgId, OrgMemberRole } from "@akabase/domain/organization/schema";
import type { EventId } from "@akabase/domain/event/schema";
import type { UserId } from "@akabase/domain/user/schema";
import { useTransition } from "react";

const roleCollection = createListCollection({
  items: ORG_ROLES.map((role) => ({
    label: ORG_ROLE_LABELS[role],
    value: role,
  })),
});

type OrgMemberRoleSelectProps = {
  eventId: EventId;
  orgId: OrgId;
  userId: UserId;
  currentRole: OrgMemberRole;
};

export function OrgMemberRoleSelect({
  eventId,
  orgId,
  userId,
  currentRole,
}: OrgMemberRoleSelectProps) {
  const { mutateAsync, isPending } = useMutation(useUpdateOrganizationMemberRoleMutationOption());
  const [, startTransition] = useTransition();

  const handleRoleChange = async (newRole: OrgMemberRole) => {
    if (newRole === currentRole) {
      return;
    }

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
      onValueChange={({ value: selectedValues }) => {
        const selectedItem = roleCollection.items.find((item) => item.value === selectedValues[0]);
        if (selectedItem) {
          startTransition(async () => {
            await handleRoleChange(selectedItem.value);
          });
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
