import type { Result } from "neverthrow";
import { inject, injectable } from "tsyringe";
import type { UseCase } from "@/shared/application/use-case.base.ts";
import type { DomainError } from "@/shared/domain/errors/index.ts";
import type {
	PaginatedResult,
	PaginationParams,
} from "@/shared/domain/pagination.ts";
import type { ProductEntity } from "../../domain/entities/product.entity.ts";
import type { ProductRepository } from "../../domain/repositories/product.repository.ts";

@injectable()
export class ListProductsUseCase
	implements UseCase<PaginatedResult<ProductEntity>, PaginationParams>
{
	constructor(
		@inject("ProductRepository")
		private readonly productRepo: ProductRepository,
	) {}

	async execute(
		params: PaginationParams,
	): Promise<Result<PaginatedResult<ProductEntity>, DomainError>> {
		return this.productRepo.findAll(params);
	}
}
