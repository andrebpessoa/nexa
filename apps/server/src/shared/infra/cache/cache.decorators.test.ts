import "reflect-metadata";
import { err, ok } from "neverthrow";
import { container } from "tsyringe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import { Cacheable, CacheInvalidate } from "./cache.decorators.ts";

const mockRedis = {
	get: vi.fn(),
	set: vi.fn(),
	scan: vi.fn(),
	del: vi.fn(),
	unlink: vi.fn(),
};

beforeEach(() => {
	vi.clearAllMocks();
	container.registerInstance("CacheClient", mockRedis);
});

afterEach(() => {
	vi.restoreAllMocks();
	container.clearInstances();
});

describe("@Cacheable", () => {
	it("should return cached value on cache hit", async () => {
		const cached = JSON.stringify({
			ok: true,
			value: { id: "1", name: "Cached" },
		});
		mockRedis.get.mockResolvedValue(cached);

		class TestRepo {
			@Cacheable()
			async findById(id: string) {
				return ok({ id, name: "FromDB" });
			}
		}

		const repo = new TestRepo();
		const result = await repo.findById("1");

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toEqual({ id: "1", name: "Cached" });
		expect(mockRedis.get).toHaveBeenCalledWith('TestRepo:findById:["1"]');
	});

	it("should call original method and cache on miss", async () => {
		mockRedis.get.mockResolvedValue(null);
		mockRedis.set.mockResolvedValue("OK");

		class TestRepo {
			@Cacheable({ ttl: 60 })
			async findAll() {
				return ok([{ id: "1" }]);
			}
		}

		const repo = new TestRepo();
		const result = await repo.findAll();

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toEqual([{ id: "1" }]);
		expect(mockRedis.set).toHaveBeenCalledWith(
			"TestRepo:findAll:[]",
			JSON.stringify({ ok: true, value: [{ id: "1" }] }),
			"EX",
			60,
		);
	});

	it("should use default TTL when not specified", async () => {
		mockRedis.get.mockResolvedValue(null);
		mockRedis.set.mockResolvedValue("OK");

		class TestRepo {
			@Cacheable()
			async findAll() {
				return ok([]);
			}
		}

		const repo = new TestRepo();
		await repo.findAll();

		expect(mockRedis.set).toHaveBeenCalledWith(
			"TestRepo:findAll:[]",
			expect.any(String),
			"EX",
			300,
		);
	});

	it("should not cache err results", async () => {
		mockRedis.get.mockResolvedValue(null);

		class TestRepo {
			@Cacheable()
			async findById(_id: string) {
				return err(DomainError.infra("DB down"));
			}
		}

		const repo = new TestRepo();
		const result = await repo.findById("1");

		expect(result.isErr()).toBe(true);
		expect(mockRedis.set).not.toHaveBeenCalled();
	});

	it("should fallback to original method when redis.get fails", async () => {
		mockRedis.get.mockRejectedValue(new Error("Redis down"));

		class TestRepo {
			@Cacheable()
			async findById(id: string) {
				return ok({ id, name: "FromDB" });
			}
		}

		const repo = new TestRepo();
		const result = await repo.findById("1");

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toEqual({ id: "1", name: "FromDB" });
	});

	it("should still return result when redis.set fails", async () => {
		mockRedis.get.mockResolvedValue(null);
		mockRedis.set.mockRejectedValue(new Error("Redis down"));

		class TestRepo {
			@Cacheable()
			async findById(id: string) {
				return ok({ id, name: "FromDB" });
			}
		}

		const repo = new TestRepo();
		const result = await repo.findById("1");

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toEqual({ id: "1", name: "FromDB" });
	});

	it("should apply hydrate function to cached value on hit", async () => {
		const cached = JSON.stringify({
			ok: true,
			value: { id: "1", raw: true },
		});
		mockRedis.get.mockResolvedValue(cached);

		const hydrate = vi.fn((raw: unknown) => {
			const data = raw as { id: string; raw: boolean };
			return { id: data.id, hydrated: true };
		});
		const serialize = vi.fn((entity: { id: string; hydrated: boolean }) => ({
			id: entity.id,
			raw: true,
		}));

		class TestRepo {
			@Cacheable({ serialize, hydrate })
			async findById(id: string) {
				return ok({ id, hydrated: true });
			}
		}

		const repo = new TestRepo();
		const result = await repo.findById("1");

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toEqual({ id: "1", hydrated: true });
		expect(hydrate).toHaveBeenCalledWith({ id: "1", raw: true });
	});

	it("should not call hydrate on cache miss", async () => {
		mockRedis.get.mockResolvedValue(null);
		mockRedis.set.mockResolvedValue("OK");

		const hydrate = vi.fn((raw: unknown) => raw);

		class TestRepo {
			@Cacheable({ hydrate })
			async findAll() {
				return ok([{ id: "1" }]);
			}
		}

		const repo = new TestRepo();
		await repo.findAll();

		expect(hydrate).not.toHaveBeenCalled();
	});

	it("should cache null single-entity values safely", async () => {
		mockRedis.get.mockResolvedValue(null);
		mockRedis.set.mockResolvedValue("OK");

		const serialize = vi.fn((entity: { id: string } | null) =>
			entity ? { id: entity.id } : null,
		);

		class TestRepo {
			@Cacheable({ serialize })
			async findById(_id: string) {
				return ok<{ id: string } | null, DomainError>(null);
			}
		}

		const repo = new TestRepo();
		const result = await repo.findById("1");

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toBeNull();
		expect(serialize).toHaveBeenCalledWith(null);
		expect(mockRedis.set).toHaveBeenCalledWith(
			'TestRepo:findById:["1"]',
			JSON.stringify({ ok: true, value: null }),
			"EX",
			300,
		);
	});

	it("should ignore invalid cached payload objects", async () => {
		mockRedis.get.mockResolvedValue(
			JSON.stringify({
				value: { id: "stale", name: "Cached" },
			}),
		);
		mockRedis.set.mockResolvedValue("OK");

		const hydrate = vi.fn(() => ({ id: "cached", name: "FromCache" }));

		class TestRepo {
			@Cacheable({ hydrate })
			async findById(id: string) {
				return ok({ id, name: "FromDB" });
			}
		}

		const repo = new TestRepo();
		const result = await repo.findById("1");

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toEqual({ id: "1", name: "FromDB" });
		expect(hydrate).not.toHaveBeenCalled();
	});

	it("should return raw deserialized value when hydrate is not provided", async () => {
		const cached = JSON.stringify({
			ok: true,
			value: { id: "1", name: "Plain" },
		});
		mockRedis.get.mockResolvedValue(cached);

		class TestRepo {
			@Cacheable()
			async findById(id: string) {
				return ok({ id, name: "FromDB" });
			}
		}

		const repo = new TestRepo();
		const result = await repo.findById("1");

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toEqual({ id: "1", name: "Plain" });
	});
});

describe("@CacheInvalidate", () => {
	it("should invalidate all keys with class prefix on ok result", async () => {
		mockRedis.scan.mockResolvedValueOnce([
			"0",
			['TestRepo:findById:["1"]', "TestRepo:findAll:[]"],
		]);
		mockRedis.unlink.mockResolvedValue(1);

		class TestRepo {
			@CacheInvalidate()
			async save(_data: unknown) {
				return ok(undefined);
			}
		}

		const repo = new TestRepo();
		await repo.save({ id: "1" });

		expect(mockRedis.scan).toHaveBeenCalledWith(
			"0",
			"MATCH",
			"TestRepo:*",
			"COUNT",
			"100",
		);
		expect(mockRedis.unlink).toHaveBeenCalledWith(
			'TestRepo:findById:["1"]',
			"TestRepo:findAll:[]",
		);
	});

	it("should not invalidate cache on err result", async () => {
		class TestRepo {
			@CacheInvalidate()
			async save(_data: unknown) {
				return err(DomainError.infra("DB error"));
			}
		}

		const repo = new TestRepo();
		await repo.save({ id: "1" });

		expect(mockRedis.scan).not.toHaveBeenCalled();
		expect(mockRedis.unlink).not.toHaveBeenCalled();
	});

	it("should use custom entity prefix when provided", async () => {
		mockRedis.scan.mockResolvedValueOnce(["0", []]);

		class TestRepo {
			@CacheInvalidate({ entity: "CustomPrefix" })
			async save(_data: unknown) {
				return ok(undefined);
			}
		}

		const repo = new TestRepo();
		await repo.save({ id: "1" });

		expect(mockRedis.scan).toHaveBeenCalledWith(
			"0",
			"MATCH",
			"CustomPrefix:*",
			"COUNT",
			"100",
		);
	});

	it("should handle multiple scan pages", async () => {
		mockRedis.scan
			.mockResolvedValueOnce(["42", ["TestRepo:findAll:[]"]])
			.mockResolvedValueOnce(["0", ['TestRepo:findById:["1"]']]);
		mockRedis.unlink.mockResolvedValue(1);

		class TestRepo {
			@CacheInvalidate()
			async save(_data: unknown) {
				return ok(undefined);
			}
		}

		const repo = new TestRepo();
		await repo.save({ id: "1" });

		expect(mockRedis.scan).toHaveBeenCalledTimes(2);
		expect(mockRedis.unlink).toHaveBeenCalledTimes(2);
	});

	it("should silently handle redis failure during invalidation", async () => {
		mockRedis.scan.mockRejectedValue(new Error("Redis down"));

		class TestRepo {
			@CacheInvalidate()
			async save(_data: unknown) {
				return ok(undefined);
			}
		}

		const repo = new TestRepo();
		const result = await repo.save({ id: "1" });

		expect(result.isOk()).toBe(true);
	});
});
