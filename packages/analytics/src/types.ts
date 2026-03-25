export interface ErrorTracker {
	captureException(error: unknown, context?: Record<string, unknown>): void;
	captureExceptionForUser(
		error: unknown,
		userId: string,
		context?: Record<string, unknown>,
	): void;
	shutdown(): Promise<void>;
}

export interface ErrorBoundaryFallbackProps {
	error: Error;
	resetError: () => void;
}
