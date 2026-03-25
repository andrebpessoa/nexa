import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import type { ErrorTracker } from "@nexa/analytics";
import type { Auth } from "@nexa/auth";
import { env } from "@nexa/env/server";
import { Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";
import z from "zod";
import { container } from "./container.ts";
import { createAuthorizationModule } from "./modules/authorization/module.ts";
import { createProductModule } from "./modules/product/module.ts";
import { DomainError, toErrorResponse } from "./shared/domain/errors/index.ts";
import { errorHandler } from "./shared/infra/middleware/error-handler.ts";

const auth = container.resolve<Auth>("Auth");

const authorizationModule = createAuthorizationModule({ auth });
const productModule = createProductModule({
	requirePermission: authorizationModule.guards.requirePermission,
});

const app = new Elysia({ serve: { maxRequestBodySize: 1 * 1024 * 1024 } })
	.use(
		openapi({
			documentation: {
				info: {
					title: "Nexa API",
					version: "1.0.0",
				},
				tags: [
					{ name: "products", description: "Product management" },
					{ name: "admin", description: "Admin operations" },
				],
			},
			mapJsonSchema: {
				zod: z.toJSONSchema,
			},
		}),
	)
	.use(
		cors({
			origin: env.CORS_ORIGIN,
			methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
			credentials: true,
		}),
	)
	.use(
		rateLimit({
			duration: 60_000,
			max: 300,
			errorResponse: new Response(
				JSON.stringify(
					toErrorResponse(DomainError.validation("Too many requests")),
				),
				{
					status: 429,
					headers: { "Content-Type": "application/json" },
				},
			),
		}),
	)
	.use(errorHandler)
	.all("/api/auth/*", (context) => {
		const { request, status } = context;
		if (["POST", "GET"].includes(request.method)) {
			return auth.handler(request);
		}
		return status(405);
	})
	.use(productModule.routes)
	.use(productModule.feedRoutes)
	.use(authorizationModule.routes)
	.get("/", () => "OK")
	.get("/health/live", () => new Response("OK", { status: 200 }))
	.get("/health/ready", async () => {
		const checks: Record<string, string> = {};

		try {
			const { db } = await import("@nexa/db");
			await (db.$client as { query(sql: string): Promise<unknown> }).query(
				"SELECT 1",
			);
			checks.database = "ok";
		} catch {
			checks.database = "error";
		}

		try {
			const { redisClient } = await import(
				"./shared/infra/cache/redis-client.ts"
			);
			await redisClient.ping();
			checks.cache = "ok";
		} catch {
			checks.cache = "error";
		}

		const allOk = Object.values(checks).every((value) => value === "ok");
		return new Response(
			JSON.stringify({ status: allOk ? "ok" : "degraded", checks }),
			{
				status: allOk ? 200 : 503,
				headers: { "Content-Type": "application/json" },
			},
		);
	});

const server = app.listen(env.PORT, () => {
	console.log(`🚀 Server is running on http://localhost:${env.PORT}`);
});

let isShuttingDown = false;
type ClosableDbClient = {
	end(): Promise<void>;
};

async function shutdown(signal: string) {
	if (isShuttingDown) {
		return;
	}

	isShuttingDown = true;
	console.log(`Received ${signal}, shutting down gracefully...`);

	server.stop(true);

	const errorTracker = container.resolve<ErrorTracker>("ErrorTracker");
	await errorTracker.shutdown();

	const { db } = await import("@nexa/db");
	await (db.$client as ClosableDbClient).end();

	const { redisClient } = await import("./shared/infra/cache/redis-client.ts");
	redisClient.close(); // Bun Redis close() is synchronous

	console.log("Graceful shutdown complete.");
	process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export type App = typeof app;
