import "reflect-metadata";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import { makeProduct } from "../../../../../test/factories/product.factory.ts";
import { makeMockProductRepository } from "../../../../../test/factories/product-repository.mock.ts";
import { ProductId } from "../../domain/value-objects/product-id.vo.ts";
import { UpdateProductUseCase } from "./update-product.use-case.ts";

describe("UpdateProductUseCase", () => {
	it("should update an existing product", async () => {
		const existing = makeProduct({
			id: "product-1",
			name: "Old Name",
			description: "Old Description",
			priceInCents: 1000,
		});
		const mockRepo = makeMockProductRepository({
			findById: vi.fn().mockResolvedValue(ok(existing)),
		});
		const useCase = new UpdateProductUseCase(mockRepo);

		const result = await useCase.execute({
			id: ProductId.create("product-1"),
			dto: {
				name: "New Name",
				description: "New Description",
				priceInCents: 2500,
			},
		});

		expect(result.isOk()).toBe(true);
		const updated = result._unsafeUnwrap();
		expect(updated.idValue).toBe(existing.idValue);
		expect(updated.name).toBe("New Name");
		expect(updated.description).toBe("New Description");
		expect(updated.price.cents).toBe(2500);
		expect(mockRepo.save).toHaveBeenCalledOnce();
	});

	it("should return NotFoundError when product does not exist", async () => {
		const mockRepo = makeMockProductRepository({
			findById: vi.fn().mockResolvedValue(ok(null)),
		});
		const useCase = new UpdateProductUseCase(mockRepo);

		const result = await useCase.execute({
			id: ProductId.create("missing-id"),
			dto: {
				name: "Any Name",
				priceInCents: 1000,
			},
		});

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("NotFoundError");
		expect(mockRepo.save).not.toHaveBeenCalled();
	});

	it("should return ValidationError for invalid price", async () => {
		const existing = makeProduct({ id: "product-1" });
		const mockRepo = makeMockProductRepository({
			findById: vi.fn().mockResolvedValue(ok(existing)),
		});
		const useCase = new UpdateProductUseCase(mockRepo);

		const result = await useCase.execute({
			id: ProductId.create("product-1"),
			dto: {
				name: "Any Name",
				priceInCents: -1,
			},
		});

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("ValidationError");
		expect(mockRepo.save).not.toHaveBeenCalled();
	});

	it("should propagate repository errors", async () => {
		const repoError = DomainError.infra("DB unavailable");
		const existing = makeProduct({ id: "product-1" });
		const mockRepo = makeMockProductRepository({
			findById: vi.fn().mockResolvedValue(ok(existing)),
			save: vi.fn().mockResolvedValue(err(repoError)),
		});
		const useCase = new UpdateProductUseCase(mockRepo);

		const result = await useCase.execute({
			id: ProductId.create("product-1"),
			dto: {
				name: "Any Name",
				priceInCents: 1000,
			},
		});

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
	});
});
