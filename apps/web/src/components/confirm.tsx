import { useRef, useSyncExternalStore } from "react";
import { Button } from "@archive/ui/components/button";
import { CloseButton } from "@archive/ui/components/close-button";
import { Dialog } from "@archive/ui/components/dialog";

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
    for (const s of subscribers) {
      s();
    }
  };

  const confirm = (options: ConfirmOptions) => {
    // oxlint-disable-next-line promise/avoid-new
    return new Promise<boolean>((resolve) => {
      const id = crypto.randomUUID();
      queue.push({
        ...options,
        id,
        resolve: (value: boolean) => {
          queue.shift();
          emit();
          resolve(value);
        },
      });
      emit();
    });
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
  const confirm = useSyncExternalStore(subscribe, getSnapshot, () => null);

  if (!confirm) {
    return null;
  }

  return <ConfirmDialog key={confirm.id} confirm={confirm} />;
}

function ConfirmDialog({ confirm }: { confirm: QueueItem }) {
  const resultRef = useRef<boolean>(false);

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
