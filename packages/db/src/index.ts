import { env } from "@nexa/env/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema/index.ts";
import { relations } from "./schema/relations.ts";

const client = postgres(env.DATABASE_URL, {
	max: env.DB_POOL_SIZE,
	connect_timeout: env.DB_CONNECTION_TIMEOUT / 1000,
	idle_timeout: 30,
});

export const db = drizzle({
	client,
	schema,
	relations,
});
