import "reflect-metadata";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import { makeProduct } from "../../../../../test/factories/product.factory.ts";
import { makeMockProductRepository } from "../../../../../test/factories/product-repository.mock.ts";
import { ListProductsUseCase } from "./list-products.use-case.ts";

describe("ListProductsUseCase", () => {
	it("should return all products", async () => {
		const products = [
			makeProduct({ name: "Camiseta" }),
			makeProduct({ name: "Calca" }),
		];
		const params = { limit: 50, offset: 0 };
		const mockRepo = makeMockProductRepository({
			findAll: vi.fn().mockResolvedValue(
				ok({
					items: products,
					total: 2,
					limit: params.limit,
					offset: params.offset,
				}),
			),
		});
		const useCase = new ListProductsUseCase(mockRepo);

		const result = await useCase.execute(params);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().items).toHaveLength(2);
		expect(result._unsafeUnwrap().items[0]?.name).toBe("Camiseta");
		expect(result._unsafeUnwrap().items[1]?.name).toBe("Calca");
	});

	it("should return empty array when no products exist", async () => {
		const params = { limit: 50, offset: 0 };
		const mockRepo = makeMockProductRepository({
			findAll: vi.fn().mockResolvedValue(
				ok({
					items: [],
					total: 0,
					limit: params.limit,
					offset: params.offset,
				}),
			),
		});
		const useCase = new ListProductsUseCase(mockRepo);

		const result = await useCase.execute(params);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().items).toHaveLength(0);
	});

	it("should propagate repository error", async () => {
		const repoError = DomainError.infra("DB connection refused");
		const params = { limit: 50, offset: 0 };
		const mockRepo = makeMockProductRepository({
			findAll: vi.fn().mockResolvedValue(err(repoError)),
		});
		const useCase = new ListProductsUseCase(mockRepo);

		const result = await useCase.execute(params);

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
	});
});
