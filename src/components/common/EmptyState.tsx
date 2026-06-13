import { Inbox } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';

export function EmptyState({ message }: { message?: string }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-10 text-muted-foreground">
      <Inbox className="size-6" />
      <p className="text-sm">{message ?? t.common.noData}</p>
    </div>
  );
}
