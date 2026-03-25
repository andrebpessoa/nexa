import posthog from "posthog-js";
import type { ErrorTracker } from "../types.ts";

export function createPostHogErrorTracker(config: {
	apiKey: string;
	host: string;
}): ErrorTracker {
	posthog.init(config.apiKey, {
		api_host: config.host,
		capture_exceptions: true,
	});

	return {
		captureException(error, context) {
			posthog.captureException(error, context);
		},
		captureExceptionForUser(error, userId, context) {
			posthog.captureException(error, {
				...context,
				userId,
			});
		},
		async shutdown() {
			// posthog-js flushes automatically in browser
		},
	};
}

export { posthog };
