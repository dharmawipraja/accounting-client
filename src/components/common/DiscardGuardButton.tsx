import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useT } from '@/lib/i18n/useT';

/** Cancel/leave button that guards against losing unsaved edits: when `dirty`,
 *  it asks for confirmation before running `onDiscard`; otherwise it discards
 *  immediately (so viewing a read-only document still closes in one click). */
export function DiscardGuardButton({
  dirty,
  onDiscard,
  label,
}: {
  dirty: boolean;
  onDiscard: () => void;
  label?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => (dirty ? setOpen(true) : onDiscard())}>
        {label ?? t.common.cancel}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t.common.discardTitle}
        description={t.common.discardMessage}
        confirmLabel={t.common.discard}
        destructive
        onConfirm={() => {
          setOpen(false);
          onDiscard();
        }}
      />
    </>
  );
}
