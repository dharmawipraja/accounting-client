import { Badge } from '@/components/ui/badge';
import { useT } from '@/lib/i18n/useT';

export function StatusBadge({ active }: { active: boolean }) {
  const t = useT();
  return (
    <Badge variant={active ? 'default' : 'secondary'} className={active ? '' : 'opacity-70'}>
      {active ? t.crud.active : t.crud.inactive}
    </Badge>
  );
}
