import { Link, useLocation } from "@tanstack/react-router";
import { BookText } from "lucide-react";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useNavItems } from "@/components/app-shared";
import { useT } from "@/lib/i18n/useT";

export function AppSidebar() {
	const t = useT();
	// Derive the active item from the reactive pathname, not from useMatchRoute's
	// stable callback: React Compiler treats that callback + item.to as unchanging
	// inputs and caches the computed `isActive`, so the highlight went stale after
	// client-side navigation. A pure comparison over `pathname` recomputes correctly.
	const pathname = useLocation({ select: (l) => l.pathname });
	const navGroups = useNavItems();

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader className="h-14 justify-center">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton asChild size="lg" tooltip={t.app.name}>
							<Link to="/dashboard">
								<BookText className="shrink-0" />
								<span className="font-semibold">{t.app.name}</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				{navGroups.map((group, gi) => (
					<SidebarGroup key={group.label ?? `group-${gi}`}>
						{group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
						<SidebarGroupContent>
							<SidebarMenu>
								{group.items.map((item) => {
									const Icon = item.icon;
									const isActive =
										pathname === item.to ||
										pathname.startsWith(`${item.to}/`);
									return (
										<SidebarMenuItem key={item.to}>
											<SidebarMenuButton
												asChild
												isActive={isActive}
												tooltip={item.label}
											>
												<Link to={item.to}>
													<Icon className="shrink-0" />
													<span>{item.label}</span>
												</Link>
											</SidebarMenuButton>
										</SidebarMenuItem>
									);
								})}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				))}
			</SidebarContent>
		</Sidebar>
	);
}
