import { err, ok, type Result } from "neverthrow";
import { inject, injectable } from "tsyringe";
import type { UseCase } from "@/shared/application/use-case.base.ts";
import {
	DomainError as DE,
	type DomainError,
} from "@/shared/domain/errors/index.ts";
import type { ProductEntity } from "../../domain/entities/product.entity.ts";
import type { ProductRepository } from "../../domain/repositories/product.repository.ts";
import { ProductId } from "../../domain/value-objects/product-id.vo.ts";

@injectable()
export class GetProductUseCase implements UseCase<ProductEntity, ProductId> {
	constructor(
		@inject("ProductRepository")
		private readonly productRepo: ProductRepository,
	) {}

	async execute(id: ProductId): Promise<Result<ProductEntity, DomainError>> {
		const result = await this.productRepo.findById(id);
		if (result.isErr()) {
			return err(result.error);
		}

		const product = result.value;
		if (!product) {
			return err(DE.notFound("Product", ProductId.unwrap(id)));
		}

		return ok(product);
	}
}
