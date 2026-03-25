import { describe, expect, it } from "vitest";
import { ProductId } from "./product-id.vo.ts";

describe("ProductId", () => {
	it("should create a ProductId from a string", () => {
		const id = ProductId.create("abc-123");
		expect(ProductId.unwrap(id)).toBe("abc-123");
	});

	it("should generate a unique ProductId", () => {
		const id1 = ProductId.generate();
		const id2 = ProductId.generate();
		expect(ProductId.unwrap(id1)).not.toBe(ProductId.unwrap(id2));
	});
});
