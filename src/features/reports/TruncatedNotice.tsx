import { TriangleAlert } from 'lucide-react';

/** Warning banner for the server's 10,000-row report caps (GL lines / aging
 *  documents). Icon + text, never color alone (a11y convention). */
export function TruncatedNotice({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;
  return (
    <div role="status" className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-4 py-2 text-sm">
      <TriangleAlert className="size-4 shrink-0 text-warning-strong" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
