import {
	BookText,
	CalendarCheck,
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

/**
 * Sidebar navigation for the authenticated app, resolved with translated
 * labels and filtered by the current user's role. Mirrors the routes mounted
 * under `/_app`. `/audit` is admin-only, matching the previous shell.
 */
export function useNavItems() {
	const t = useT();
	const role = useSession((s) => s.user?.role);

	const items = [
		{ to: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard, adminOnly: false },
		{ to: "/accounts", label: t.nav.accounts, icon: BookText, adminOnly: false },
		{ to: "/journals", label: t.nav.journals, icon: NotebookText, adminOnly: false },
		{ to: "/reports", label: t.nav.reports, icon: FileChartColumn, adminOnly: false },
		{ to: "/periods", label: t.nav.periods, icon: CalendarCheck, adminOnly: false },
		{ to: "/partners", label: t.nav.partners, icon: Users, adminOnly: false },
		{ to: "/tax-codes", label: t.nav.taxCodes, icon: Percent, adminOnly: false },
		{ to: "/sales-invoices", label: t.nav.salesInvoices, icon: Receipt, adminOnly: false },
		{ to: "/purchase-bills", label: t.nav.purchaseBills, icon: ReceiptText, adminOnly: false },
		{ to: "/payments", label: t.nav.payments, icon: Wallet, adminOnly: false },
		{ to: "/settings", label: t.nav.settings, icon: Settings, adminOnly: false },
		{ to: "/audit", label: t.nav.audit, icon: ScrollText, adminOnly: true },
	] as const;

	return items.filter((item) => !item.adminOnly || role === "ADMIN");
}
