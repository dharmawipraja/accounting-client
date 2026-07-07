import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandPalette } from "@/components/common/CommandPalette";
import { ChangePasswordScreen } from "@/features/auth/ChangePasswordScreen";
import { useHydrateSession } from "@/features/auth/useHydrateSession";
import { useT } from "@/lib/i18n/useT";
import { useSession } from "@/stores/session";

export function AppShell({ children }: { children: ReactNode }) {
	// Hydrate user from /auth/me on mount/reload if a token exists but no user yet.
	useHydrateSession();
	const t = useT();
	const mustChangePassword = useSession((s) => s.user?.mustChangePassword ?? false);
	if (mustChangePassword) return <ChangePasswordScreen />;

	return (
		<TooltipProvider delayDuration={0}>
			<SidebarProvider>
				{/* Skip link: first focusable element so keyboard users can bypass the nav (WCAG 2.4.1). */}
				<a
					href="#main-content"
					className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
				>
					{t.common.skipToContent}
				</a>
				<AppSidebar />
				<CommandPalette />
				<SidebarInset id="main-content" tabIndex={-1} className="p-4 md:p-6 outline-none">
					<AppHeader />
					<div className="flex flex-1 flex-col gap-4">{children}</div>
				</SidebarInset>
			</SidebarProvider>
		</TooltipProvider>
	);
}
