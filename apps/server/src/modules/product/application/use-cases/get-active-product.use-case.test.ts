import "reflect-metadata";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import { makeProduct } from "../../../../../test/factories/product.factory.ts";
import { makeMockProductRepository } from "../../../../../test/factories/product-repository.mock.ts";
import { ProductId } from "../../domain/value-objects/product-id.vo.ts";
import { GetActiveProductUseCase } from "./get-active-product.use-case.ts";

describe("GetActiveProductUseCase", () => {
	it("should return an active product by id", async () => {
		const product = makeProduct({
			id: "active-id",
			name: "Active",
			active: true,
		});
		const id = ProductId.create("active-id");
		const mockRepo = makeMockProductRepository({
			findActiveById: vi.fn().mockResolvedValue(ok(product)),
		});
		const useCase = new GetActiveProductUseCase(mockRepo);

		const result = await useCase.execute(id);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().name).toBe("Active");
	});

	it("should return NotFoundError when product not found", async () => {
		const mockRepo = makeMockProductRepository({
			findActiveById: vi.fn().mockResolvedValue(ok(null)),
		});
		const useCase = new GetActiveProductUseCase(mockRepo);

		const result = await useCase.execute(ProductId.create("missing"));

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("NotFoundError");
	});

	it("should return NotFoundError when product is inactive", async () => {
		const mockRepo = makeMockProductRepository({
			findActiveById: vi.fn().mockResolvedValue(ok(null)),
		});
		const useCase = new GetActiveProductUseCase(mockRepo);

		const result = await useCase.execute(ProductId.create("inactive"));

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("NotFoundError");
	});

	it("should propagate repository error", async () => {
		const mockRepo = makeMockProductRepository({
			findActiveById: vi
				.fn()
				.mockResolvedValue(err(DomainError.infra("DB error"))),
		});
		const useCase = new GetActiveProductUseCase(mockRepo);

		const result = await useCase.execute(ProductId.create("any-id"));

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
	});
});
