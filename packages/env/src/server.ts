import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

const corsOriginSchema = z.preprocess((value) => {
	if (typeof value !== "string") {
		return value;
	}

	try {
		const parsed = JSON.parse(value);
		return parsed;
	} catch {
		return value;
	}
}, z.array(z.url()));

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		DB_POOL_SIZE: z.coerce.number().int().positive().default(10),
		DB_CONNECTION_TIMEOUT: z.coerce.number().int().positive().default(10000),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		CORS_ORIGIN: corsOriginSchema.default(["http://localhost:3001"]),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		REDIS_URL: z.string().default("redis://localhost:6379"),
		PORT: z.coerce.number().int().positive().default(3000),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
