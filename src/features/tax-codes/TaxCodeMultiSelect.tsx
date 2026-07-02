import { EntityMultiSelect, type EntitySelectAdapter } from '@/components/common/EntitySelect';
import { taxCodesApi } from './hooks';
import type { TaxCode } from './schema';

interface TaxCodeMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  allowedKinds: string[];
  disabled?: boolean;
  placeholder?: string;
  'aria-label'?: string;
}

/** Active tax codes of the allowed kinds, as a multi-select with code chips. */
export function TaxCodeMultiSelect({ allowedKinds, ...props }: TaxCodeMultiSelectProps) {
  const adapter: EntitySelectAdapter<TaxCode> = {
    useList: taxCodesApi.useList,
    getValue: (c) => c.id,
    getLabel: (c) => `${c.code} — ${c.name}`,
    getSearchText: (c) => `${c.code} ${c.name}`,
    filter: (c) => c.isActive && allowedKinds.includes(c.kind),
  };
  return <EntityMultiSelect adapter={adapter} getChipLabel={(c) => c.code} {...props} />;
}
