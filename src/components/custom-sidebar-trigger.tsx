import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useT } from "@/lib/i18n/useT";

export function CustomSidebarTrigger() {
	const t = useT();
	return (
		<Tooltip delayDuration={1000}>
			<TooltipTrigger asChild>
				<SidebarTrigger aria-label={t.nav.toggleSidebar} />
			</TooltipTrigger>
			<TooltipContent className="flex items-center gap-1 px-2 py-1" side="right">
				{t.nav.toggleSidebar}
				<KbdGroup>
					<Kbd>⌘</Kbd>
					<Kbd>b</Kbd>
				</KbdGroup>
			</TooltipContent>
		</Tooltip>
	);
}
