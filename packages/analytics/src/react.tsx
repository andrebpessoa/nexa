import { createContext, type ReactNode, useContext } from "react";
import type { ErrorBoundaryFallbackProps, ErrorTracker } from "./types.ts";

const ErrorTrackerContext = createContext<ErrorTracker | null>(null);

export function useErrorTracker(): ErrorTracker {
	const tracker = useContext(ErrorTrackerContext);
	if (!tracker) {
		throw new Error("useErrorTracker must be used within an AnalyticsProvider");
	}
	return tracker;
}

export function AnalyticsProvider({
	tracker,
	children,
}: {
	tracker: ErrorTracker;
	children: ReactNode;
}) {
	return <ErrorTrackerContext value={tracker}>{children}</ErrorTrackerContext>;
}

export type { ErrorBoundaryFallbackProps };
