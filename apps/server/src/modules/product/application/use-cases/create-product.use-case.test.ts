import "reflect-metadata";
import { err } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import { makeMockProductRepository } from "../../../../../test/factories/product-repository.mock.ts";
import { createProductDto } from "../dtos/create-product.dto.ts";
import { CreateProductUseCase } from "./create-product.use-case.ts";

describe("CreateProductUseCase", () => {
	it("should create a product successfully", async () => {
		const mockRepo = makeMockProductRepository();
		const useCase = new CreateProductUseCase(mockRepo);

		const result = await useCase.execute({
			name: "Camiseta",
			priceInCents: 4990,
		});

		expect(result.isOk()).toBe(true);
		const product = result._unsafeUnwrap();
		expect(product.name).toBe("Camiseta");
		expect(product.price.cents).toBe(4990);
		expect(product.active).toBe(true);
		expect(product.idValue).toBeDefined();
		expect(mockRepo.save).toHaveBeenCalledOnce();
	});

	it("should set description when provided", async () => {
		const mockRepo = makeMockProductRepository();
		const useCase = new CreateProductUseCase(mockRepo);

		const result = await useCase.execute({
			name: "Camiseta",
			priceInCents: 4990,
			description: "Algodao premium",
		});

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().description).toBe("Algodao premium");
	});

	it("should set description to null when not provided", async () => {
		const mockRepo = makeMockProductRepository();
		const useCase = new CreateProductUseCase(mockRepo);

		const result = await useCase.execute({
			name: "Camiseta",
			priceInCents: 4990,
		});

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().description).toBeNull();
	});

	it("should fail with negative price", async () => {
		const mockRepo = makeMockProductRepository();
		const useCase = new CreateProductUseCase(mockRepo);

		const result = await useCase.execute({
			name: "Camiseta",
			priceInCents: -100,
		});

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("ValidationError");
		expect(mockRepo.save).not.toHaveBeenCalled();
	});

	it("should fail with non-integer price", async () => {
		const mockRepo = makeMockProductRepository();
		const useCase = new CreateProductUseCase(mockRepo);

		const result = await useCase.execute({
			name: "Camiseta",
			priceInCents: 49.9,
		});

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("ValidationError");
	});

	it("should propagate repository save error", async () => {
		const repoError = DomainError.infra("DB connection lost");
		const mockRepo = makeMockProductRepository({
			save: vi.fn().mockResolvedValue(err(repoError)),
		});
		const useCase = new CreateProductUseCase(mockRepo);

		const result = await useCase.execute({
			name: "Camiseta",
			priceInCents: 4990,
		});

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
		expect(result._unsafeUnwrapErr().message).toBe("DB connection lost");
	});

	it("should reject empty name", async () => {
		const dto = { name: "", description: null, priceInCents: 1000 };

		const parsed = createProductDto.safeParse(dto);

		expect(parsed.success).toBe(false);
	});

	it("should reject description over 5000 chars", async () => {
		const longDesc = "a".repeat(5001);
		const dto = { name: "Valid", description: longDesc, priceInCents: 1000 };

		const parsed = createProductDto.safeParse(dto);

		expect(parsed.success).toBe(false);
	});
});
