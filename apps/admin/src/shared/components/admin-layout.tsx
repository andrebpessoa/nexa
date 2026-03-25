import { Button } from "@nexa/ui/components/button.tsx";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Package } from "lucide-react";

import { authClient } from "@/lib/auth-client.ts";

export default function AdminLayout() {
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();

	const navItems = [
		{ to: "/products", label: "Products", icon: Package },
	] as const;

	return (
		<div className="grid h-svh grid-cols-[240px_1fr]">
			<aside className="flex flex-col border-r bg-card p-4">
				<div className="mb-6">
					<h1 className="font-bold text-lg">Nexa Admin</h1>
					<p className="text-muted-foreground text-xs">{session?.user.email}</p>
				</div>
				<nav className="flex flex-1 flex-col gap-1">
					{navItems.map(({ to, label, icon: Icon }) => (
						<Link
							key={to}
							to={to}
							className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted [&.active]:bg-muted [&.active]:font-medium"
						>
							<Icon size={16} />
							{label}
						</Link>
					))}
				</nav>
				<Button
					variant="outline"
					onClick={() => {
						authClient.signOut({
							fetchOptions: {
								onSuccess: () => navigate({ to: "/login" }),
							},
						});
					}}
				>
					Sign Out
				</Button>
			</aside>
			<main className="overflow-y-auto p-6">
				<Outlet />
			</main>
		</div>
	);
}
