import { Toaster } from "@nexa/ui/components/sonner.tsx";
import {
	createRootRoute,
	Outlet,
	useMatch,
	useNavigate,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import appCss from "@/index.css?url";
import { authClient } from "@/lib/auth-client.ts";
import AdminLayout from "@/shared/components/admin-layout.tsx";
import { ErrorFallback } from "@/shared/components/error-fallback.tsx";

export const Route = createRootRoute({
	component: RootComponent,
	head: () => ({
		links: [{ rel: "stylesheet", href: appCss }],
	}),
});

function RootComponent() {
	const { data: session, isPending } = authClient.useSession();
	const navigate = useNavigate();
	const loginMatch = useMatch({ from: "/login", shouldThrow: false });
	const isLoginPage = Boolean(loginMatch);

	useEffect(() => {
		if (isPending) return;

		if (!session && !isLoginPage) {
			navigate({ to: "/login" });
			return;
		}

		if (session && session.user.role !== "admin" && !isLoginPage) {
			navigate({ to: "/login" });
		}
	}, [session, isPending, isLoginPage, navigate]);

	if (isPending) {
		return (
			<div className="flex h-svh items-center justify-center">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	return (
		<ErrorBoundary
			fallbackRender={(props) => (
				<ErrorFallback {...props} reportUrl="mailto:suporte@nexa.com" />
			)}
		>
			{isLoginPage ? (
				<>
					<Outlet />
					<Toaster richColors />
					<TanStackRouterDevtools position="bottom-left" />
				</>
			) : !session || session.user.role !== "admin" ? null : (
				<>
					<AdminLayout />
					<Toaster richColors />
					<TanStackRouterDevtools position="bottom-left" />
				</>
			)}
		</ErrorBoundary>
	);
}
