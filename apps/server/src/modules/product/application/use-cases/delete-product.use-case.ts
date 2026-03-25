import { err, ok, type Result } from "neverthrow";
import { inject, injectable } from "tsyringe";
import type { UseCase } from "@/shared/application/use-case.base.ts";
import {
	DomainError as DE,
	type DomainError,
} from "@/shared/domain/errors/index.ts";
import type { ProductRepository } from "../../domain/repositories/product.repository.ts";
import { ProductId } from "../../domain/value-objects/product-id.vo.ts";

@injectable()
export class DeleteProductUseCase implements UseCase<void, ProductId> {
	constructor(
		@inject("ProductRepository")
		private readonly productRepo: ProductRepository,
	) {}

	async execute(id: ProductId): Promise<Result<void, DomainError>> {
		const existingResult = await this.productRepo.findById(id);
		if (existingResult.isErr()) {
			return err(existingResult.error);
		}

		const existing = existingResult.value;
		if (!existing) {
			return err(DE.notFound("Product", ProductId.unwrap(id)));
		}

		const deleteResult = existing.softDelete();
		if (deleteResult.isErr()) {
			return err(deleteResult.error);
		}

		const saveResult = await this.productRepo.save(existing);
		if (saveResult.isErr()) {
			return err(saveResult.error);
		}

		return ok(undefined);
	}
}
