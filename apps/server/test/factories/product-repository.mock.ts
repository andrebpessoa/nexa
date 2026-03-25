import { ok } from "neverthrow";
import { vi } from "vitest";
import type { ProductRepository } from "@/modules/product/domain/repositories/product.repository.ts";

export function makeMockProductRepository(
	overrides: Partial<ProductRepository> = {},
): ProductRepository {
	return {
		findById: vi.fn(),
		findAll: vi.fn(),
		findAllActive: vi.fn(),
		findActiveById: vi.fn(),
		save: vi.fn().mockResolvedValue(ok(undefined)),
		delete: vi.fn(),
		...overrides,
	};
}
