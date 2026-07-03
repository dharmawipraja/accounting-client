import { Link, useMatchRoute } from "@tanstack/react-router";
import { BookText } from "lucide-react";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useNavItems } from "@/components/app-shared";
import { useT } from "@/lib/i18n/useT";

export function AppSidebar() {
	const t = useT();
	const matchRoute = useMatchRoute();
	const navItems = useNavItems();

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
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{navItems.map((item) => {
								const Icon = item.icon;
								const isActive = Boolean(
									matchRoute({ to: item.to, fuzzy: true }),
								);
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
			</SidebarContent>
		</Sidebar>
	);
}
