import { describe, expect, it } from "vitest";
import { Price } from "../value-objects/price.vo.ts";
import { ProductId } from "../value-objects/product-id.vo.ts";
import { ProductEntity } from "./product.entity.ts";

describe("ProductEntity", () => {
	const validPrice = Price.create(2990)._unsafeUnwrap();
	const now = new Date();

	function createValid(
		overrides: Partial<{
			id: string;
			name: string;
			description: string | null;
			price: Price;
			active: boolean;
		}> = {},
	) {
		return ProductEntity.create({
			id: ProductId.create(overrides.id ?? "abc-123"),
			name: overrides.name ?? "Camiseta",
			description:
				overrides.description === undefined
					? "Algodao premium"
					: overrides.description,
			price: overrides.price ?? validPrice,
			active: overrides.active ?? true,
			createdAt: now,
			updatedAt: now,
		});
	}

	describe("create", () => {
		it("should create a product with all properties", () => {
			const result = createValid();

			expect(result.isOk()).toBe(true);
			const product = result._unsafeUnwrap();
			expect(product.idValue).toBe("abc-123");
			expect(product.name).toBe("Camiseta");
			expect(product.description).toBe("Algodao premium");
			expect(product.price.cents).toBe(2990);
			expect(product.active).toBe(true);
			expect(product.deletedAt).toBeNull();
		});

		it("should reject empty name", () => {
			const result = createValid({ name: "" });
			expect(result.isErr()).toBe(true);
			expect(result._unsafeUnwrapErr()._tag).toBe("ValidationError");
		});

		it("should reject whitespace-only name", () => {
			const result = createValid({ name: "   " });
			expect(result.isErr()).toBe(true);
		});

		it("should create with null description", () => {
			const result = createValid({ description: null });
			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap().description).toBeNull();
		});
	});

	describe("update", () => {
		it("should update name, description, and price", () => {
			const product = createValid()._unsafeUnwrap();
			const newPrice = Price.create(5990)._unsafeUnwrap();
			const oldUpdatedAt = product.updatedAt;

			const result = product.update({
				name: "Novo Nome",
				description: "Nova descricao",
				price: newPrice,
			});

			expect(result.isOk()).toBe(true);
			expect(product.name).toBe("Novo Nome");
			expect(product.description).toBe("Nova descricao");
			expect(product.price.cents).toBe(5990);
			expect(product.updatedAt.getTime()).toBeGreaterThanOrEqual(
				oldUpdatedAt.getTime(),
			);
		});

		it("should reject empty name on update", () => {
			const product = createValid()._unsafeUnwrap();
			const result = product.update({
				name: "",
				description: null,
				price: validPrice,
			});
			expect(result.isErr()).toBe(true);
			expect(product.name).toBe("Camiseta");
		});
	});

	describe("activate / deactivate", () => {
		it("should deactivate an active product", () => {
			const product = createValid({ active: true })._unsafeUnwrap();
			expect(product.deactivate().isOk()).toBe(true);
			expect(product.active).toBe(false);
		});

		it("should activate an inactive product", () => {
			const product = createValid({ active: false })._unsafeUnwrap();
			expect(product.activate().isOk()).toBe(true);
			expect(product.active).toBe(true);
		});

		it("should fail to activate a deleted product", () => {
			const product = createValid()._unsafeUnwrap();
			product.softDelete();
			expect(product.activate().isErr()).toBe(true);
		});

		it("should fail to deactivate a deleted product", () => {
			const product = createValid()._unsafeUnwrap();
			product.softDelete();
			expect(product.deactivate().isErr()).toBe(true);
		});
	});

	describe("softDelete", () => {
		it("should soft delete a product", () => {
			const product = createValid()._unsafeUnwrap();
			expect(product.softDelete().isOk()).toBe(true);
			expect(product.isDeleted).toBe(true);
			expect(product.active).toBe(false);
			expect(product.deletedAt).toBeInstanceOf(Date);
		});

		it("should fail to delete an already deleted product", () => {
			const product = createValid()._unsafeUnwrap();
			product.softDelete();
			expect(product.softDelete().isErr()).toBe(true);
		});
	});

	describe("equals", () => {
		it("should compare by id", () => {
			const p1 = createValid({ id: "same" })._unsafeUnwrap();
			const p2 = createValid({ id: "same", name: "Different" })._unsafeUnwrap();
			expect(p1.equals(p2)).toBe(true);
		});

		it("should not be equal with different ids", () => {
			const p1 = createValid({ id: "id-1" })._unsafeUnwrap();
			const p2 = createValid({ id: "id-2" })._unsafeUnwrap();
			expect(p1.equals(p2)).toBe(false);
		});
	});
});
