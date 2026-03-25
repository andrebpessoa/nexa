import type { Elysia } from "elysia";
import {
	type DomainError,
	toErrorResponse,
	toHttpStatus,
} from "../../domain/errors/index.ts";

function isDomainError(error: unknown): error is DomainError {
	return (
		typeof error === "object" &&
		error !== null &&
		"_tag" in error &&
		"message" in error
	);
}

export const errorHandler = (app: Elysia) =>
	app.onError(({ error, request }) => {
		if (isDomainError(error)) {
			return new Response(JSON.stringify(toErrorResponse(error)), {
				status: toHttpStatus(error),
				headers: { "Content-Type": "application/json" },
			});
		}

		console.error("[server] Unhandled error:", {
			path: new URL(request.url).pathname,
			method: request.method,
			error,
		});

		return new Response(
			JSON.stringify({
				error: "INTERNAL_ERROR",
				message: "Internal server error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	});
