import { describe, expect, it } from "vitest";
import { makeProduct } from "../../../../../test/factories/product.factory.ts";
import { productResponseSchema } from "../schemas/product-response.schema.ts";
import { ProductResponseMapper } from "./product-response.mapper.ts";

describe("ProductResponseMapper", () => {
	it("serializes a product to the public HTTP contract", () => {
		const entity = makeProduct({ id: "prod-1", priceInCents: 2590 });
		const response = ProductResponseMapper.toResponse(entity);

		expect(response).toEqual({
			id: "prod-1",
			name: entity.name,
			description: entity.description,
			priceInCents: 2590,
			active: entity.active,
			deletedAt: null,
			createdAt: entity.createdAt.toISOString(),
			updatedAt: entity.updatedAt.toISOString(),
		});
	});

	it("produces output that validates against the response schema", () => {
		const entity = makeProduct({ id: "prod-2", priceInCents: 100 });
		const response = ProductResponseMapper.toResponse(entity);
		const parsed = productResponseSchema.safeParse(response);

		expect(parsed.success).toBe(true);
	});

	it("hydrates cached payloads whose ISO timestamps were revived to Date", () => {
		const entity = makeProduct({ id: "prod-3", priceInCents: 1500 });

		const hydrated = ProductResponseMapper.fromCacheList([
			{
				...ProductResponseMapper.toResponse(entity),
				createdAt: entity.createdAt,
				updatedAt: entity.updatedAt,
			},
		]);

		expect(hydrated).toHaveLength(1);
		expect(hydrated[0]?.id).toBe(entity.id);
		expect(hydrated[0]?.createdAt).toEqual(entity.createdAt);
		expect(hydrated[0]?.updatedAt).toEqual(entity.updatedAt);
	});

	it("returns null for invalid cache payload objects", () => {
		expect(
			ProductResponseMapper.fromCacheOrNull({
				id: "prod-invalid",
			}),
		).toBeNull();
	});

	it("hydrates cached response lists directly", () => {
		const entity = makeProduct({ id: "prod-4", priceInCents: 990 });

		const hydrated = ProductResponseMapper.fromCacheList([
			ProductResponseMapper.toResponse(entity),
		]);

		expect(hydrated).toHaveLength(1);
		expect(hydrated[0]?.id).toBe(entity.id);
		expect(hydrated[0]?.price.cents).toBe(entity.price.cents);
	});
});
