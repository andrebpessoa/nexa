import { env } from "@nexa/env/server";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import * as schema from "./schema/index.ts";
import { relations } from "./schema/relations.ts";

const pool = mysql.createPool({
	uri: env.DATABASE_URL,
	connectionLimit: env.DB_POOL_SIZE,
	queueLimit: env.DB_QUEUE_LIMIT,
	connectTimeout: env.DB_CONNECTION_TIMEOUT,
	waitForConnections: true,
});

export const db = drizzle({
	client: pool,
	schema,
	relations,
	mode: "default",
});
