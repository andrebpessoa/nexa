import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "@nexa/db/schema/index";
import { product } from "@nexa/db/schema/product";
import {
	PostgreSqlContainer,
	type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

type TestDatabase = typeof import("@nexa/db")["db"];

export async function setupTestDatabase(): Promise<{
	db: TestDatabase;
	container: StartedPostgreSqlContainer;
}> {
	const container = await new PostgreSqlContainer("postgres:17-alpine")
		.withDatabase("test_db")
		.withUsername("test")
		.withPassword("test")
		.withStartupTimeout(180_000)
		.start();

	const client = postgres(container.getConnectionUri(), { max: 1 });
	const db = drizzle({ client, schema }) as TestDatabase;

	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	await migrate(db, {
		migrationsFolder: path.resolve(
			__dirname,
			"../../../../packages/db/src/migrations",
		),
	});

	return { db, container };
}

export async function cleanProductTable(db: TestDatabase) {
	await db.delete(product);
}

export async function teardownTestDatabase(
	container: StartedPostgreSqlContainer,
) {
	await container.stop();
}
