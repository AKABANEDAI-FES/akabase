import { Result } from "@akabase/result";
import { createListCollection } from "@ark-ui/react/collection";
import { useTransition } from "react";
import { useMutation } from "@tanstack/react-query";
import { useUpdateGlobalRoleMutationOption } from "../actions/mutations";
import { Select } from "@akabase/ui/components/select";
import { toaster } from "@akabase/ui/components/toast";
import { GLOBAL_ROLES, GLOBAL_ROLE_LABELS } from "@akabase/domain/authorization/schema";
import type { GlobalRole } from "@akabase/domain/authorization/schema";

const roleCollection = createListCollection({
  items: GLOBAL_ROLES.map((role) => ({
    label: GLOBAL_ROLE_LABELS[role],
    value: role,
  })),
});

type GlobalRoleSelectProps = {
  userId: string;
  currentRole: GlobalRole;
};

export function GlobalRoleSelect({ userId, currentRole }: GlobalRoleSelectProps) {
  const { mutateAsync, isPending } = useMutation(useUpdateGlobalRoleMutationOption());
  const [, startTransition] = useTransition();

  const handleRoleChange = async (newRole: GlobalRole) => {
    if (newRole === currentRole) {
      return;
    }

    try {
      const result = await mutateAsync({
        data: { userId, role: newRole },
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
          startTransition(async () => {
            await handleRoleChange(selectedItem.value);
          });
        }
      }}
      disabled={isPending}
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
