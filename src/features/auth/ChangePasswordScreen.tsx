import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';
import { BookText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';
import { logoutCurrentDevice } from '@/lib/api/logout';
import { useSession } from '@/stores/session';
import { fetchMe } from './useMe';
import { ChangePasswordForm } from './ChangePasswordForm';

export function ChangePasswordScreen() {
  const t = useT();
  const navigate = useNavigate();

  async function handleSignOut() {
    await logoutCurrentDevice();
    useSession.getState().clear();
    void navigate({ to: '/login' });
  }

  async function onSuccess() {
    toast.success(t.auth.passwordChanged);
    useSession.getState().setMustChangePassword(false);
    // Re-hydrate to pick up the server's cleared flag (belt and suspenders).
    try {
      useSession.getState().setUser(await fetchMe());
    } catch {
      /* the in-memory flag flip already unlocks the shell */
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex items-center gap-2">
          <BookText className="size-6" aria-hidden="true" />
          <span className="text-lg font-semibold">{t.app.name}</span>
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{t.auth.forcedTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.auth.forcedSubtitle}</p>
        </div>
        <ChangePasswordForm
          submitLabel={t.auth.changePassword}
          currentPasswordLabel={t.auth.tempPasswordLabel}
          onSuccess={onSuccess}
        />
        <Button variant="ghost" className="w-full" onClick={() => void handleSignOut()}>
          {t.auth.signOut}
        </Button>
      </div>
    </div>
  );
}
