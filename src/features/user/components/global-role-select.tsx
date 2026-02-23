import { useRouter } from "@tanstack/react-router";
import { useTransition } from "react";
import { Result } from "@praha/byethrow";
import { createListCollection } from "@ark-ui/react/collection";
import { updateGlobalRoleFn } from "@/features/user/actions";
import { Select, toaster } from "@/components/ui";
import { GLOBAL_ROLES, GLOBAL_ROLE_LABELS } from "@/domain/authorization/schema";
import type { GlobalRole } from "@/domain/authorization/schema";

const roleCollection = createListCollection({
  items: GLOBAL_ROLES.map((role) => ({
    label: GLOBAL_ROLE_LABELS[role],
    value: role,
  })),
});

interface GlobalRoleSelectProps {
  userId: string;
  currentRole: GlobalRole;
}

export function GlobalRoleSelect({ userId, currentRole }: GlobalRoleSelectProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (newRole: GlobalRole) => {
    if (newRole === currentRole) return;

    startTransition(async () => {
      try {
        const result = await updateGlobalRoleFn({
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

        router.invalidate();
      } catch {
        toaster.create({
          type: "error",
          title: "エラー",
          description: "予期しないエラーが発生しました",
        });
      }
    });
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
