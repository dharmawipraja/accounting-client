import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';

function FatalError() {
  const t = useT();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-12 text-center">
      <TriangleAlert className="size-8 text-destructive" />
      <p className="text-lg font-semibold">{t.errors.fatalTitle}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{t.errors.fatalMessage}</p>
      <Button className="mt-2" onClick={() => window.location.reload()}>
        {t.errors.reload}
      </Button>
    </div>
  );
}

/** Last-resort boundary for render-time crashes. Query/route errors are handled
 *  before reaching here (QueryState / router errorComponent). */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: true } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info);
  }

  render() {
    return this.state.hasError ? <FatalError /> : this.props.children;
  }
}
