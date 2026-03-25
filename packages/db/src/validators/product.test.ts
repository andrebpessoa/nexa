import { describe, expect, it } from "vitest";
import { productResponseSchema } from "./product.ts";

describe("productResponseSchema", () => {
	it("should accept a valid product response with ISO date strings", () => {
		const valid = {
			id: "abc-123",
			name: "Camiseta",
			description: "Algodao premium",
			priceInCents: 4990,
			active: true,
			deletedAt: null,
			createdAt: "2026-03-18T12:00:00.000Z",
			updatedAt: "2026-03-18T12:00:00.000Z",
		};

		const result = productResponseSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});

	it("should reject Date objects in createdAt/updatedAt", () => {
		const invalid = {
			id: "abc-123",
			name: "Camiseta",
			description: null,
			priceInCents: 4990,
			active: true,
			deletedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = productResponseSchema.safeParse(invalid);
		expect(result.success).toBe(false);
	});
});
