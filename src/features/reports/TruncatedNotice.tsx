import { WarningNotice } from '@/components/common/WarningNotice';

/** Warning banner for the server's 10,000-row report caps (GL lines / aging
 *  documents). Thin wrapper over the shared WarningNotice. */
export function TruncatedNotice({ show, message }: { show: boolean; message: string }) {
  return <WarningNotice show={show} message={message} />;
}
