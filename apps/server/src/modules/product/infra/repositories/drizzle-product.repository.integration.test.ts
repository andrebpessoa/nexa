import "reflect-metadata";
import { product } from "@nexa/db/schema/product";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import { eq } from "drizzle-orm";
import {
	GenericContainer,
	type StartedTestContainer,
	Wait,
} from "testcontainers";
import { container } from "tsyringe";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makeProduct } from "../../../../../test/factories/product.factory.ts";
import {
	cleanProductTable,
	setupTestDatabase,
	teardownTestDatabase,
} from "../../../../../test/helpers/test-container.ts";
import { ProductId } from "../../domain/value-objects/product-id.vo.ts";
import { DrizzleProductRepository } from "./drizzle-product.repository.ts";

async function scanKeys(
	redis: Bun.RedisClient,
	match: string,
): Promise<string[]> {
	let cursor = "0";
	const keys: string[] = [];

	do {
		const [nextCursor, pageKeys] = await redis.scan(
			cursor,
			"MATCH",
			match,
			"COUNT",
			"100",
		);
		cursor = nextCursor;
		keys.push(...pageKeys);
	} while (cursor !== "0");

	return keys;
}

async function flushRedis(redis: Bun.RedisClient): Promise<void> {
	const keys = await scanKeys(redis, "*");
	if (keys.length > 0) {
		await redis.del(...keys);
	}
}

describe("DrizzleProductRepository", () => {
	let db: Awaited<ReturnType<typeof setupTestDatabase>>["db"];
	let mysqlContainer: StartedMySqlContainer | undefined;
	let redisContainer: StartedTestContainer | undefined;
	let redisClient: Bun.RedisClient;
	let repo: DrizzleProductRepository;

	beforeAll(async () => {
		const result = await setupTestDatabase();
		db = result.db;
		mysqlContainer = result.container;

		redisContainer = await new GenericContainer("redis:7-alpine")
			.withExposedPorts(6379)
			.withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/i))
			.withStartupTimeout(120_000)
			.start();

		const redisUrl = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;
		redisClient = new Bun.RedisClient(redisUrl);
		container.registerInstance("CacheClient", redisClient);

		repo = new DrizzleProductRepository(db);
	}, 180000);

	afterAll(async () => {
		container.clearInstances();
		redisClient.close();
		if (redisContainer) {
			await redisContainer.stop();
		}
		if (mysqlContainer) {
			await teardownTestDatabase(mysqlContainer);
		}
	});

	beforeEach(async () => {
		await cleanProductTable(db);
		await flushRedis(redisClient);
	});

	it("should save a product and retrieve it by id", async () => {
		const product = makeProduct({ name: "Camiseta", priceInCents: 4990 });

		const saveResult = await repo.save(product);
		expect(saveResult.isOk()).toBe(true);

		const findResult = await repo.findById(product.id);
		expect(findResult.isOk()).toBe(true);

		const found = findResult._unsafeUnwrap();
		expect(found).not.toBeNull();
		expect(found?.name).toBe("Camiseta");
		expect(found?.price.cents).toBe(4990);
		expect(found?.active).toBe(true);
	});

	it("should return null for non-existent id", async () => {
		const findResult = await repo.findById(ProductId.create("non-existent-id"));

		expect(findResult.isOk()).toBe(true);
		expect(findResult._unsafeUnwrap()).toBeNull();
	});

	it("should list all products", async () => {
		const product1 = makeProduct({ name: "Camiseta" });
		const product2 = makeProduct({ name: "Calca" });

		await repo.save(product1);
		await repo.save(product2);

		const listResult = await repo.findAll({ limit: 50, offset: 0 });
		expect(listResult.isOk()).toBe(true);
		expect(listResult._unsafeUnwrap().items).toHaveLength(2);
	});

	it("should return empty array when no products exist", async () => {
		const listResult = await repo.findAll({ limit: 50, offset: 0 });

		expect(listResult.isOk()).toBe(true);
		expect(listResult._unsafeUnwrap().items).toHaveLength(0);
	});

	it("should update product on duplicate key (upsert)", async () => {
		const product = makeProduct({ name: "Original", priceInCents: 1000 });
		await repo.save(product);

		const updated = makeProduct({
			id: product.id,
			name: "Updated",
			priceInCents: 2000,
		});
		await repo.save(updated);

		const findResult = await repo.findById(product.id);
		expect(findResult.isOk()).toBe(true);

		const found = findResult._unsafeUnwrap();
		expect(found?.name).toBe("Updated");
		expect(found?.price.cents).toBe(2000);
	});

	it("should delete a product", async () => {
		const entity = makeProduct();
		await repo.save(entity);
		const productId = entity.idValue;

		const deleteResult = await repo.delete(entity.id);
		expect(deleteResult.isOk()).toBe(true);

		const findResult = await repo.findById(entity.id);
		expect(findResult.isOk()).toBe(true);
		expect(findResult._unsafeUnwrap()).toBeNull();

		const persistedRows = await db
			.select()
			.from(product)
			.where(eq(product.id, productId))
			.limit(1);

		expect(persistedRows).toHaveLength(1);
		expect(persistedRows[0]?.deletedAt).toBeInstanceOf(Date);
	});

	it("should handle delete of non-existent product without error", async () => {
		const deleteResult = await repo.delete(ProductId.create("non-existent-id"));
		expect(deleteResult.isOk()).toBe(true);
	});

	it("should paginate findAll correctly", async () => {
		for (let i = 0; i < 5; i++) {
			await repo.save(makeProduct({ name: `Product ${i}` }));
		}

		const page1 = await repo.findAll({ limit: 2, offset: 0 });
		expect(page1.isOk()).toBe(true);
		const result1 = page1._unsafeUnwrap();
		expect(result1.items).toHaveLength(2);
		expect(result1.total).toBe(5);
		expect(result1.limit).toBe(2);
		expect(result1.offset).toBe(0);

		const page2 = await repo.findAll({ limit: 2, offset: 2 });
		expect(page2._unsafeUnwrap().items).toHaveLength(2);

		const page3 = await repo.findAll({ limit: 2, offset: 4 });
		expect(page3._unsafeUnwrap().items).toHaveLength(1);
	});

	it("should paginate findAllActive correctly", async () => {
		await repo.save(makeProduct({ name: "Active 1", active: true }));
		await repo.save(makeProduct({ name: "Active 2", active: true }));
		await repo.save(makeProduct({ name: "Inactive", active: false }));

		const result = await repo.findAllActive({ limit: 10, offset: 0 });
		expect(result.isOk()).toBe(true);
		const data = result._unsafeUnwrap();
		expect(data.items).toHaveLength(2);
		expect(data.total).toBe(2);
	});
});
