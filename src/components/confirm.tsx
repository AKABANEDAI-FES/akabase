import { useRef, useSyncExternalStore } from "react";
import { Button, CloseButton, Dialog } from "./ui";

export type ConfirmOptions = {
  title: string;
  description?: string;
  cancelText?: string;
  confirmText?: string;
};

type QueueItem = ConfirmOptions & { resolve: (value: boolean) => void; id: string };

function createConfirm() {
  const queue: QueueItem[] = [];
  const subscribers = new Set<() => void>();

  const emit = () => {
    subscribers.forEach((s) => s());
  };

  const confirm = (options: ConfirmOptions) => {
    const { promise, resolve: r } = Promise.withResolvers<boolean>();

    const resolve = (value: boolean) => {
      queue.shift();
      emit();
      r(value);
    };

    queue.push({ ...options, resolve, id: crypto.randomUUID() });
    emit();

    return promise;
  };

  const subscribe = (cb: () => void) => {
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  };

  const getSnapshot = () => queue[0] || null;

  return { confirm, subscribe, getSnapshot };
}

const { confirm, subscribe, getSnapshot } = createConfirm();

export function ConfirmHost() {
  const resultRef = useRef<boolean>(false);
  const confirm = useSyncExternalStore(subscribe, getSnapshot, () => null);

  if (!confirm) return null;

  return (
    <Dialog.Root
      defaultOpen
      role="alertdialog"
      key={confirm.id}
      onExitComplete={() => confirm.resolve(resultRef.current)}
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>{confirm.title}</Dialog.Title>
            {confirm.description && <Dialog.Description>{confirm.description}</Dialog.Description>}
          </Dialog.Header>
          <Dialog.Footer>
            <Dialog.ActionTrigger asChild>
              <Button colorPalette="gray" variant="outline">
                {confirm.cancelText || "キャンセル"}
              </Button>
            </Dialog.ActionTrigger>
            <Dialog.ActionTrigger asChild>
              <Button
                colorPalette="red"
                onClick={() => {
                  resultRef.current = true;
                }}
              >
                {confirm.confirmText || "OK"}
              </Button>
            </Dialog.ActionTrigger>
          </Dialog.Footer>
          <Dialog.CloseTrigger asChild>
            <CloseButton />
          </Dialog.CloseTrigger>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}

export { confirm };
