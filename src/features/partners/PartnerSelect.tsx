import { EntitySelect, type EntitySelectAdapter } from '@/components/common/EntitySelect';
import { partnersApi } from './hooks';
import type { Partner } from './schema';

interface PartnerSelectProps {
  value?: string;
  onChange: (id: string) => void;
  filter?: 'customer' | 'vendor' | 'all';
  disabled?: boolean;
  placeholder?: string;
  'aria-label'?: string;
}

/** Active partners, optionally narrowed to customers or vendors. */
export function PartnerSelect({ filter = 'all', ...props }: PartnerSelectProps) {
  const adapter: EntitySelectAdapter<Partner> = {
    useList: partnersApi.useList,
    getValue: (p) => p.id,
    getLabel: (p) => `${p.code} — ${p.name}`,
    getSearchText: (p) => `${p.code} ${p.name}`,
    filter: (p) => p.isActive && (filter === 'all' || (filter === 'customer' ? p.isCustomer : p.isVendor)),
  };
  return <EntitySelect adapter={adapter} {...props} />;
}
