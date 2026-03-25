import "reflect-metadata";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import { makeMockProductRepository } from "../../../../../test/factories/product-repository.mock.ts";
import { ProductEntity } from "../../domain/entities/product.entity.ts";
import { Price } from "../../domain/value-objects/price.vo.ts";
import { ProductId } from "../../domain/value-objects/product-id.vo.ts";
import { DeleteProductUseCase } from "./delete-product.use-case.ts";

function makeProduct(overrides: Partial<{ id: string }> = {}) {
	const price = Price.create(1000)._unsafeUnwrap();
	return ProductEntity.create({
		id: ProductId.create(overrides.id ?? "p-1"),
		name: "Product",
		description: null,
		price,
		active: true,
		createdAt: new Date("2026-03-20T10:00:00.000Z"),
		updatedAt: new Date("2026-03-20T10:00:00.000Z"),
	})._unsafeUnwrap();
}

describe("DeleteProductUseCase", () => {
	it("should soft delete product and persist via save", async () => {
		const product = makeProduct();
		const repo = makeMockProductRepository({
			findById: vi.fn().mockResolvedValue(ok(product)),
		});
		const useCase = new DeleteProductUseCase(repo);

		const result = await useCase.execute(ProductId.create("p-1"));

		expect(result.isOk()).toBe(true);
		expect(product.isDeleted).toBe(true);
		expect(repo.save).toHaveBeenCalledOnce();
		expect(repo.delete).not.toHaveBeenCalled();
	});

	it("should return not found when product does not exist", async () => {
		const repo = makeMockProductRepository({
			findById: vi.fn().mockResolvedValue(ok(null)),
		});
		const useCase = new DeleteProductUseCase(repo);

		const result = await useCase.execute(ProductId.create("missing"));

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("NotFoundError");
		expect(repo.save).not.toHaveBeenCalled();
	});

	it("should propagate repository errors", async () => {
		const repo = makeMockProductRepository({
			findById: vi
				.fn()
				.mockResolvedValue(err(DomainError.infra("DB unavailable"))),
		});
		const useCase = new DeleteProductUseCase(repo);

		const result = await useCase.execute(ProductId.create("p-1"));

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
	});

	it("should fail when product is already deleted", async () => {
		const product = makeProduct();
		product.softDelete();
		const repo = makeMockProductRepository({
			findById: vi.fn().mockResolvedValue(ok(product)),
		});
		const useCase = new DeleteProductUseCase(repo);

		const result = await useCase.execute(ProductId.create("p-1"));

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("ValidationError");
		expect(repo.save).not.toHaveBeenCalled();
	});
});
