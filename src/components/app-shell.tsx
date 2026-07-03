import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { useHydrateSession } from "@/features/auth/useHydrateSession";

export function AppShell({ children }: { children: ReactNode }) {
	// Hydrate user from /auth/me on mount/reload if a token exists but no user yet.
	useHydrateSession();

	return (
		<TooltipProvider delayDuration={0}>
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset className="p-4 md:p-6">
					<AppHeader />
					<div className="flex flex-1 flex-col gap-4">{children}</div>
				</SidebarInset>
			</SidebarProvider>
		</TooltipProvider>
	);
}
