import "reflect-metadata";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import { makeProduct } from "../../../../../test/factories/product.factory.ts";
import { makeMockProductRepository } from "../../../../../test/factories/product-repository.mock.ts";
import { ProductId } from "../../domain/value-objects/product-id.vo.ts";
import { GetProductUseCase } from "./get-product.use-case.ts";

describe("GetProductUseCase", () => {
	it("should return a product when found", async () => {
		const id = ProductId.create("existing-id");
		const product = makeProduct({ id: "existing-id", name: "Camiseta" });
		const mockRepo = makeMockProductRepository({
			findById: vi.fn().mockResolvedValue(ok(product)),
		});
		const useCase = new GetProductUseCase(mockRepo);

		const result = await useCase.execute(id);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().name).toBe("Camiseta");
		expect(mockRepo.findById).toHaveBeenCalledWith(id);
	});

	it("should return NotFoundError when product does not exist", async () => {
		const mockRepo = makeMockProductRepository({
			findById: vi.fn().mockResolvedValue(ok(null)),
		});
		const useCase = new GetProductUseCase(mockRepo);

		const result = await useCase.execute(ProductId.create("non-existent-id"));

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("NotFoundError");
		expect(result._unsafeUnwrapErr().message).toContain("non-existent-id");
	});

	it("should propagate repository error", async () => {
		const repoError = DomainError.infra("DB timeout");
		const mockRepo = makeMockProductRepository({
			findById: vi.fn().mockResolvedValue(err(repoError)),
		});
		const useCase = new GetProductUseCase(mockRepo);

		const result = await useCase.execute(ProductId.create("any-id"));

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
	});
});
