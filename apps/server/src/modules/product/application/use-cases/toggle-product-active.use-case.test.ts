import "reflect-metadata";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import { makeMockProductRepository } from "../../../../../test/factories/product-repository.mock.ts";
import { ProductEntity } from "../../domain/entities/product.entity.ts";
import { Price } from "../../domain/value-objects/price.vo.ts";
import { ProductId } from "../../domain/value-objects/product-id.vo.ts";
import { ToggleProductActiveUseCase } from "./toggle-product-active.use-case.ts";

function makeProduct(overrides: Partial<{ id: string; active: boolean }> = {}) {
	const price = Price.create(1000)._unsafeUnwrap();
	return ProductEntity.create({
		id: ProductId.create(overrides.id ?? "p-1"),
		name: "Product",
		description: null,
		price,
		active: overrides.active ?? true,
		createdAt: new Date("2026-03-20T10:00:00.000Z"),
		updatedAt: new Date("2026-03-20T10:00:00.000Z"),
	})._unsafeUnwrap();
}

describe("ToggleProductActiveUseCase", () => {
	it("should deactivate an active product", async () => {
		const product = makeProduct({ active: true });
		const repo = makeMockProductRepository({
			findById: vi.fn().mockResolvedValue(ok(product)),
		});
		const useCase = new ToggleProductActiveUseCase(repo);

		const result = await useCase.execute({
			id: ProductId.create("p-1"),
			dto: { active: false },
		});

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().active).toBe(false);
		expect(repo.save).toHaveBeenCalledOnce();
	});

	it("should activate an inactive product", async () => {
		const product = makeProduct({ active: false });
		const repo = makeMockProductRepository({
			findById: vi.fn().mockResolvedValue(ok(product)),
		});
		const useCase = new ToggleProductActiveUseCase(repo);

		const result = await useCase.execute({
			id: ProductId.create("p-1"),
			dto: { active: true },
		});

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().active).toBe(true);
	});

	it("should return not found when product does not exist", async () => {
		const repo = makeMockProductRepository({
			findById: vi.fn().mockResolvedValue(ok(null)),
		});
		const useCase = new ToggleProductActiveUseCase(repo);

		const result = await useCase.execute({
			id: ProductId.create("missing"),
			dto: { active: true },
		});

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("NotFoundError");
		expect(repo.save).not.toHaveBeenCalled();
	});

	it("should propagate repository infra errors", async () => {
		const repo = makeMockProductRepository({
			findById: vi
				.fn()
				.mockResolvedValue(err(DomainError.infra("DB unavailable"))),
		});
		const useCase = new ToggleProductActiveUseCase(repo);

		const result = await useCase.execute({
			id: ProductId.create("p-1"),
			dto: { active: true },
		});

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
	});

	it("should fail when trying to activate deleted product", async () => {
		const product = makeProduct({ active: false });
		product.softDelete();
		const repo = makeMockProductRepository({
			findById: vi.fn().mockResolvedValue(ok(product)),
		});
		const useCase = new ToggleProductActiveUseCase(repo);

		const result = await useCase.execute({
			id: ProductId.create("p-1"),
			dto: { active: true },
		});

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("ValidationError");
		expect(repo.save).not.toHaveBeenCalled();
	});
});
