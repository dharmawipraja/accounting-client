import { useBlocker } from '@tanstack/react-router';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useT } from '@/lib/i18n/useT';

/** Blocks leaving an editor with unsaved changes — covers in-app route
 *  navigation (sidebar, breadcrumb, back) AND browser tab-close / refresh.
 *  `shouldBlock` is read live at navigation time, so callers can exclude an
 *  intentional save/discard. `enableBeforeUnload` must be wired to the SAME
 *  predicate: it defaults to `true`, which would fire the native "leave site?"
 *  prompt on every editor (read-only views and clean forms included), not just
 *  when there are unsaved changes.
 *  Render <UnsavedGuardDialog> with the returned guard to prompt the user. */
export function useUnsavedGuard(shouldBlock: () => boolean) {
  return useBlocker({ shouldBlockFn: shouldBlock, enableBeforeUnload: shouldBlock, withResolver: true });
}

type Guard = ReturnType<typeof useUnsavedGuard>;

export function UnsavedGuardDialog({ guard }: { guard: Guard }) {
  const t = useT();
  const blocked = guard.status === 'blocked';
  return (
    <ConfirmDialog
      open={blocked}
      onOpenChange={(open) => { if (!open && blocked) guard.reset(); }}
      title={t.common.discardTitle}
      description={t.common.discardMessage}
      confirmLabel={t.common.discard}
      destructive
      onConfirm={() => { if (blocked) guard.proceed(); }}
    />
  );
}
