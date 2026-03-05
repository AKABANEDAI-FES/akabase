import { useQuery } from "@tanstack/react-query";
import { useListCollection } from "@ark-ui/react/collection";
import { useFilter } from "@ark-ui/react/locale";
import { Combobox, Spinner } from "@/components/ui";
import { generateLoadUsersForEventQueryOptions } from "@/features/user/actions/queries";
import type { ComboboxInputValueChangeDetails, ComboboxValueChangeDetails } from "@ark-ui/react";
import type { EventId } from "@/domain/shared/ids";
import type { EmailFieldProps } from "./add-member-dialog";
import { useEffect } from "react";

interface UserEmailComboboxProps extends EmailFieldProps {
  eventId: EventId;
}

export function UserEmailCombobox({ eventId, value, onChange }: UserEmailComboboxProps) {
  const { data: users = [], isLoading } = useQuery(generateLoadUsersForEventQueryOptions(eventId));

  const userItems = users.map((u) => ({
    label: `${u.name} (${u.email})`,
    value: u.email,
    name: u.name,
  }));

  const { contains } = useFilter({ sensitivity: "base" });

  const { collection, filter, set } = useListCollection({
    initialItems: userItems,
    limit: 10,
    filter: contains,
  });

  useEffect(() => {
    set(userItems);
  }, [userItems, set]);

  const handleInputChange = (details: ComboboxInputValueChangeDetails) => {
    filter(details.inputValue);
  };

  const handleValueChange = (details: ComboboxValueChangeDetails) => {
    onChange(details.value[0] ?? null);
  };

  return (
    <Combobox.Root
      collection={collection}
      onInputValueChange={handleInputChange}
      onValueChange={handleValueChange}
      value={value ? [value] : []}
    >
      <Combobox.Label>ユーザー検索</Combobox.Label>
      <Combobox.Control>
        <Combobox.Input placeholder="example@toyo.jp" />
        <Combobox.IndicatorGroup>
          <Combobox.ClearTrigger />
          <Combobox.Trigger />
        </Combobox.IndicatorGroup>
      </Combobox.Control>
      <Combobox.Positioner>
        <Combobox.Content>
          {isLoading ? (
            <Combobox.Empty gap="2">
              <Spinner size="sm" />
              ユーザーを読み込み中...
            </Combobox.Empty>
          ) : collection.items.length === 0 ? (
            <Combobox.Empty>ユーザーが見つかりません</Combobox.Empty>
          ) : null}
          {collection.items.map((item) => (
            <Combobox.Item item={item} key={item.value}>
              {item.label}
              <Combobox.ItemIndicator />
            </Combobox.Item>
          ))}
        </Combobox.Content>
      </Combobox.Positioner>
    </Combobox.Root>
  );
}
