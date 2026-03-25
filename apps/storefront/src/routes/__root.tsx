import { ErrorFallback } from "@nexa/analytics/components/error-fallback";
import { PostHogAnalyticsProvider } from "@nexa/analytics/posthog/react";
import { env } from "@nexa/env/storefront";
import { Toaster } from "@nexa/ui/components/sonner.tsx";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import Header from "@/shared/components/header.tsx";

import appCss from "../index.css?url";

const posthogKey = env.VITE_PUBLIC_POSTHOG_KEY;
const posthogHost = env.VITE_PUBLIC_POSTHOG_HOST;

export type RouterAppContext = object;

export const Route = createRootRouteWithContext<RouterAppContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "My App",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	component: RootDocument,
});

function RootDocument() {
	return (
		<html className="dark" lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<PostHogAnalyticsProvider
					apiKey={posthogKey}
					host={posthogHost}
					errorFallback={(props) => (
						<ErrorFallback {...props} reportUrl="mailto:suporte@nexa.com" />
					)}
				>
					<div className="grid h-svh grid-rows-[auto_1fr]">
						<Header />
						<Outlet />
					</div>
				</PostHogAnalyticsProvider>
				<Toaster richColors />
				<TanStackRouterDevtools position="bottom-left" />
				<Scripts />
			</body>
		</html>
	);
}
