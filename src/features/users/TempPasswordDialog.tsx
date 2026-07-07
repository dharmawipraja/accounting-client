import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useT } from '@/lib/i18n/useT';

export function TempPasswordDialog({
  open,
  onOpenChange,
  email,
  tempPassword,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  email: string;
  tempPassword: string;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
    } catch {
      /* clipboard blocked; the value is on screen to copy manually */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label={t.users.tempPasswordTitle}>
        <DialogHeader>
          <DialogTitle>{t.users.tempPasswordTitle}</DialogTitle>
          <DialogDescription>{t.users.tempPasswordFor.replace('{email}', email)}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <code className="flex-1 font-mono text-sm">{tempPassword}</code>
          <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? t.users.copied : t.users.copy}
          </Button>
        </div>
        <p className="text-xs text-warning-foreground">{t.users.tempPasswordWarning}</p>
      </DialogContent>
    </Dialog>
  );
}
