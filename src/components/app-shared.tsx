import type { LucideIcon } from "lucide-react";
import {
	BookText,
	CalendarCheck,
	ClipboardCheck,
	FileChartColumn,
	LayoutDashboard,
	NotebookText,
	Percent,
	Receipt,
	ReceiptText,
	ScrollText,
	Settings,
	Users,
	Wallet,
} from "lucide-react";
import { useT } from "@/lib/i18n/useT";
import { useSession } from "@/stores/session";

type NavTo =
	| "/dashboard"
	| "/sales-invoices"
	| "/purchase-bills"
	| "/payments"
	| "/journals"
	| "/approvals"
	| "/accounts"
	| "/reports"
	| "/periods"
	| "/partners"
	| "/tax-codes"
	| "/settings"
	| "/audit";

export interface NavItem {
	to: NavTo;
	label: string;
	icon: LucideIcon;
}
export interface NavGroup {
	/** Section heading; omitted for the standalone Dashboard group. */
	label?: string;
	items: NavItem[];
}

/**
 * Sidebar navigation for the authenticated app, grouped by an accountant's
 * mental model (Transactions / Ledger / Data & System) so 12 flat items become
 * scannable sections. Labels are translated; membership mirrors the routes
 * mounted under `/_app`. `/audit` is admin-only, matching the previous shell.
 */
export function useNavItems(): NavGroup[] {
	const t = useT();
	const role = useSession((s) => s.user?.role);

	const setup: NavItem[] = [
		{ to: "/partners", label: t.nav.partners, icon: Users },
		{ to: "/tax-codes", label: t.nav.taxCodes, icon: Percent },
		{ to: "/settings", label: t.nav.settings, icon: Settings },
	];
	if (role === "ADMIN") setup.push({ to: "/audit", label: t.nav.audit, icon: ScrollText });

	return [
		{ items: [{ to: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard }] },
		{
			label: t.nav.groupTransactions,
			items: [
				{ to: "/sales-invoices", label: t.nav.salesInvoices, icon: Receipt },
				{ to: "/purchase-bills", label: t.nav.purchaseBills, icon: ReceiptText },
				{ to: "/payments", label: t.nav.payments, icon: Wallet },
				{ to: "/journals", label: t.nav.journals, icon: NotebookText },
				{ to: "/approvals", label: t.nav.approvals, icon: ClipboardCheck },
			],
		},
		{
			label: t.nav.groupLedger,
			items: [
				{ to: "/accounts", label: t.nav.accounts, icon: BookText },
				{ to: "/reports", label: t.nav.reports, icon: FileChartColumn },
				{ to: "/periods", label: t.nav.periods, icon: CalendarCheck },
			],
		},
		{ label: t.nav.groupSetup, items: setup },
	];
}
