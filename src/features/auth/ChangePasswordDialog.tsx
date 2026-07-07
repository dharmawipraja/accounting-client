import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useT } from '@/lib/i18n/useT';
import { ChangePasswordForm } from './ChangePasswordForm';

export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label={t.auth.changePassword}>
        <DialogHeader>
          <DialogTitle>{t.auth.changePassword}</DialogTitle>
          <DialogDescription>{t.auth.newPasswordHint}</DialogDescription>
        </DialogHeader>
        <ChangePasswordForm
          submitLabel={t.auth.changePassword}
          currentPasswordLabel={t.auth.currentPassword}
          onSuccess={() => {
            toast.success(t.auth.passwordChanged);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
