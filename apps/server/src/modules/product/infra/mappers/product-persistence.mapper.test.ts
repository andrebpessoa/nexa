import type { ProductRow } from "@nexa/db/validators/product";
import { describe, expect, it } from "vitest";
import { ProductPersistenceMapper } from "./product-persistence.mapper.ts";

const row: ProductRow = {
	id: "prod-1",
	name: "Camiseta",
	description: null,
	priceInCents: 1990,
	active: true,
	deletedAt: null,
	createdAt: new Date("2026-03-20T10:00:00.000Z"),
	updatedAt: new Date("2026-03-20T10:00:00.000Z"),
};

describe("ProductPersistenceMapper", () => {
	it("maps a valid database row into a domain entity", () => {
		const result = ProductPersistenceMapper.toDomain(row);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().price.cents).toBe(1990);
	});

	it("returns an infra error when persisted price is invalid", () => {
		const result = ProductPersistenceMapper.toDomain({
			...row,
			priceInCents: -1,
		});

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
	});
});
