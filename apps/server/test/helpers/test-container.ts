import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "@nexa/db/schema/index";
import { product } from "@nexa/db/schema/product";
import {
	MySqlContainer,
	type StartedMySqlContainer,
} from "@testcontainers/mysql";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { Wait } from "testcontainers";

type TestDatabase = typeof import("@nexa/db")["db"];

export async function setupTestDatabase(): Promise<{
	db: TestDatabase;
	container: StartedMySqlContainer;
}> {
	const container = await new MySqlContainer("mysql:8")
		.withDatabase("test_db")
		.withUsername("test")
		.withUserPassword("test")
		.withWaitStrategy(
			Wait.forLogMessage(/ready for connections.*port:\s*3306/i),
		)
		.withStartupTimeout(180_000)
		.start();

	const db = drizzle({
		connection: { uri: container.getConnectionUri() },
		schema,
		mode: "default",
	}) as TestDatabase;

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

export async function teardownTestDatabase(container: StartedMySqlContainer) {
	await container.stop();
}
