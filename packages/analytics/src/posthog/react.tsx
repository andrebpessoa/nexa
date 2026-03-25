import { PostHogErrorBoundary, PostHogProvider } from "@posthog/react";
import { type ReactNode, useState } from "react";
import { AnalyticsProvider } from "../react.tsx";
import type { ErrorBoundaryFallbackProps } from "../types.ts";
import { createPostHogErrorTracker, posthog } from "./client.ts";

let tracker: ReturnType<typeof createPostHogErrorTracker> | null = null;

function toError(error: unknown): Error {
	if (error instanceof Error) {
		return error;
	}

	return new Error(typeof error === "string" ? error : "Unknown error");
}

function getTracker(apiKey: string, host: string) {
	if (!tracker) {
		tracker = createPostHogErrorTracker({ apiKey, host });
	}
	return tracker;
}

export function PostHogAnalyticsProvider({
	apiKey,
	host,
	children,
	errorFallback,
}: {
	apiKey: string;
	host: string;
	children: ReactNode;
	errorFallback: (props: ErrorBoundaryFallbackProps) => ReactNode;
}) {
	const errorTracker = getTracker(apiKey, host);
	const [boundaryKey, setBoundaryKey] = useState(0);

	const resetError = () => {
		setBoundaryKey((currentKey) => currentKey + 1);
	};

	return (
		<PostHogProvider client={posthog}>
			<AnalyticsProvider tracker={errorTracker}>
				<PostHogErrorBoundary
					key={boundaryKey}
					fallback={({ error }) =>
						errorFallback({ error: toError(error), resetError })
					}
				>
					{children}
				</PostHogErrorBoundary>
			</AnalyticsProvider>
		</PostHogProvider>
	);
}
