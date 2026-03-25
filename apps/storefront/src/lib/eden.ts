import { treaty } from "@elysiajs/eden";
import { env } from "@nexa/env/storefront";
import type { App } from "@server";
import type { ErrorResponse } from "@/shared/presentation/schemas/error-response.schema.ts";

export const api = treaty<App>(env.VITE_SERVER_URL, {
	fetch: {
		credentials: "include",
	},
});

type EdenErrorPayload = ErrorResponse | { message?: string };

type EdenFetchResult<T> =
	| { data: T; error: null }
	| { data: null; error: { value: EdenErrorPayload } };

export async function edenFetch<T>(
	fn: () => Promise<EdenFetchResult<T>>,
): Promise<T> {
	const result = await fn();
	if (result.error) {
		throw new Error(result.error.value.message ?? "Request failed");
	}
	return result.data;
}
