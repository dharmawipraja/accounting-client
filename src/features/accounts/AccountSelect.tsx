import { EntitySelect, type EntitySelectAdapter } from '@/components/common/EntitySelect';
import { accountsApi } from './hooks';
import type { Account } from './schema';

const accountAdapter: EntitySelectAdapter<Account> = {
  useList: accountsApi.useList,
  getValue: (a) => a.id,
  getLabel: (a) => `${a.code} — ${a.name}`,
  getSearchText: (a) => `${a.code} ${a.name}`,
  filter: (a) => a.isPostable && a.isActive,
};

interface AccountSelectProps {
  value?: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
  'aria-label'?: string;
}

/** Postable + active accounts, as a searchable combobox. */
export function AccountSelect(props: AccountSelectProps) {
  return <EntitySelect adapter={accountAdapter} {...props} />;
}
