import { useNavigate } from "@tanstack/react-router";
import { KeyRound, LogOut } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChangePasswordDialog } from "@/features/auth/ChangePasswordDialog";
import { logoutAllDevices, logoutCurrentDevice } from "@/lib/api/logout";
import { useT } from "@/lib/i18n/useT";
import { useSession } from "@/stores/session";

export function NavUser() {
	const t = useT();
	const navigate = useNavigate();
	const user = useSession((s) => s.user);
	const clear = useSession((s) => s.clear);
	const [pwOpen, setPwOpen] = useState(false);

	async function handleSignOut() {
		await logoutCurrentDevice();
		clear();
		void navigate({ to: "/login" });
	}
	async function handleSignOutAll() {
		await logoutAllDevices();
		clear();
		void navigate({ to: "/login" });
	}

	const initial = user?.email?.charAt(0).toUpperCase() ?? "?";

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						aria-label={t.auth.accountMenu}
						className="rounded-full"
						size="icon"
						variant="ghost"
					>
						<Avatar className="size-8">
							<AvatarFallback>{initial}</AvatarFallback>
						</Avatar>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-56">
					<DropdownMenuLabel className="flex flex-col gap-0.5">
						<span className="truncate font-medium text-foreground">
							{user?.email}
						</span>
						{user?.role ? (
							<span className="text-xs font-normal text-muted-foreground">
								{user.role}
							</span>
						) : null}
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem onSelect={() => setPwOpen(true)}>
						<KeyRound />
						{t.auth.changePassword}
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onSelect={() => void handleSignOut()}>
						<LogOut />
						{t.auth.signOut}
					</DropdownMenuItem>
					<DropdownMenuItem
						variant="destructive"
						onSelect={() => void handleSignOutAll()}
					>
						<LogOut />
						{t.auth.signOutAllDevices}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
		</>
	);
}
