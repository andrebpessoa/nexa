import { err, ok, type Result } from "neverthrow";
import { inject, injectable } from "tsyringe";
import type { UseCase } from "@/shared/application/use-case.base.ts";
import type { DomainError } from "@/shared/domain/errors/index.ts";
import { ProductEntity } from "../../domain/entities/product.entity.ts";
import type { ProductRepository } from "../../domain/repositories/product.repository.ts";
import { Price } from "../../domain/value-objects/price.vo.ts";
import { ProductId } from "../../domain/value-objects/product-id.vo.ts";
import type { CreateProductDto } from "../dtos/create-product.dto.ts";

@injectable()
export class CreateProductUseCase
	implements UseCase<ProductEntity, CreateProductDto>
{
	constructor(
		@inject("ProductRepository")
		private readonly productRepo: ProductRepository,
	) {}

	async execute(
		dto: CreateProductDto,
	): Promise<Result<ProductEntity, DomainError>> {
		const priceOrError = Price.create(dto.priceInCents);
		if (priceOrError.isErr()) {
			return err(priceOrError.error);
		}

		const now = new Date();
		const productOrError = ProductEntity.create({
			id: ProductId.generate(),
			name: dto.name,
			description: dto.description ?? null,
			price: priceOrError.value,
			active: true,
			createdAt: now,
			updatedAt: now,
		});
		if (productOrError.isErr()) {
			return err(productOrError.error);
		}

		const product = productOrError.value;
		const saveResult = await this.productRepo.save(product);
		if (saveResult.isErr()) {
			return err(saveResult.error);
		}

		return ok(product);
	}
}
