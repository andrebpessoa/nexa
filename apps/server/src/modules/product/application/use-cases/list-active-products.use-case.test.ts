import "reflect-metadata";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import { makeProduct } from "../../../../../test/factories/product.factory.ts";
import { makeMockProductRepository } from "../../../../../test/factories/product-repository.mock.ts";
import { ListActiveProductsUseCase } from "./list-active-products.use-case.ts";

describe("ListActiveProductsUseCase", () => {
	it("should return only active products", async () => {
		const products = [makeProduct({ name: "Active Product", active: true })];
		const params = { limit: 50, offset: 0 };
		const mockRepo = makeMockProductRepository({
			findAllActive: vi.fn().mockResolvedValue(
				ok({
					items: products,
					total: 1,
					limit: params.limit,
					offset: params.offset,
				}),
			),
		});
		const useCase = new ListActiveProductsUseCase(mockRepo);

		const result = await useCase.execute(params);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().items).toHaveLength(1);
		expect(result._unsafeUnwrap().items[0]?.name).toBe("Active Product");
	});

	it("should return empty array when no active products", async () => {
		const params = { limit: 50, offset: 0 };
		const mockRepo = makeMockProductRepository({
			findAllActive: vi.fn().mockResolvedValue(
				ok({
					items: [],
					total: 0,
					limit: params.limit,
					offset: params.offset,
				}),
			),
		});
		const useCase = new ListActiveProductsUseCase(mockRepo);

		const result = await useCase.execute(params);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().items).toHaveLength(0);
	});

	it("should propagate repository error", async () => {
		const params = { limit: 50, offset: 0 };
		const mockRepo = makeMockProductRepository({
			findAllActive: vi
				.fn()
				.mockResolvedValue(err(DomainError.infra("DB error"))),
		});
		const useCase = new ListActiveProductsUseCase(mockRepo);

		const result = await useCase.execute(params);

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
	});
});
