import { Separator } from "@/components/ui/separator";
import { CustomSidebarTrigger } from "@/components/custom-sidebar-trigger";
import { NavUser } from "@/components/nav-user";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { CommandPaletteHint } from "@/components/common/CommandPalette";
import { useSession } from "@/stores/session";

export function AppHeader() {
	const email = useSession((s) => s.user?.email);

	return (
		<header className="mb-4 flex items-center justify-between gap-2">
			<CustomSidebarTrigger />
			<div className="flex items-center gap-2">
				{email ? (
					<span className="hidden text-sm text-muted-foreground sm:inline">
						{email}
					</span>
				) : null}
				<CommandPaletteHint />
				<ThemeToggle />
				<Separator
					className="h-4 data-[orientation=vertical]:self-center"
					orientation="vertical"
				/>
				<NavUser />
			</div>
		</header>
	);
}
