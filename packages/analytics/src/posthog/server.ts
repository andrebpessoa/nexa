import { PostHog } from "posthog-node";
import type { ErrorTracker } from "../types.ts";

export function createPostHogServerErrorTracker(config: {
	apiKey: string;
	host: string;
}): ErrorTracker {
	const client = new PostHog(config.apiKey, {
		host: config.host,
		enableExceptionAutocapture: true,
	});

	return {
		captureException(error, context) {
			client.captureException(error, "anonymous", context);
		},
		captureExceptionForUser(error, userId, context) {
			client.captureException(error, userId, context);
		},
		async shutdown() {
			await client.shutdown();
		},
	};
}
