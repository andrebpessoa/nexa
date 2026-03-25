import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = process.env;

const baseEnv = {
	DATABASE_URL: "mysql://user:password@localhost:3306/nexa",
	BETTER_AUTH_SECRET: "12345678901234567890123456789012",
	BETTER_AUTH_URL: "http://localhost:3000",
	NODE_ENV: "test",
	REDIS_URL: "redis://localhost:6379",
};

describe("server env", () => {
	beforeEach(() => {
		vi.resetModules();
		process.env = { ...ORIGINAL_ENV, ...baseEnv };
	});

	afterEach(() => {
		process.env = ORIGINAL_ENV;
	});

	it("parses CORS_ORIGIN from a JSON array string", async () => {
		process.env.CORS_ORIGIN = '["http://localhost:3001"]';

		const { env } = await import("./server");

		expect(env.CORS_ORIGIN).toEqual(["http://localhost:3001"]);
	});

	it("parses a single origin JSON array string", async () => {
		process.env.CORS_ORIGIN = '["http://localhost:3001"]';

		const { env } = await import("./server");

		expect(env.CORS_ORIGIN).toEqual(["http://localhost:3001"]);
	});
});
