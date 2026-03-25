import { err, ok, type Result } from "neverthrow";
import { inject, injectable } from "tsyringe";
import type { UseCase } from "@/shared/application/use-case.base.ts";
import {
	DomainError as DE,
	type DomainError,
} from "@/shared/domain/errors/index.ts";
import type { ProductEntity } from "../../domain/entities/product.entity.ts";
import type { ProductRepository } from "../../domain/repositories/product.repository.ts";
import { Price } from "../../domain/value-objects/price.vo.ts";
import { ProductId } from "../../domain/value-objects/product-id.vo.ts";
import type { UpdateProductDto } from "../dtos/update-product.dto.ts";

export interface UpdateProductInput {
	id: ProductId;
	dto: UpdateProductDto;
}

@injectable()
export class UpdateProductUseCase
	implements UseCase<ProductEntity, UpdateProductInput>
{
	constructor(
		@inject("ProductRepository")
		private readonly productRepo: ProductRepository,
	) {}

	async execute(
		input: UpdateProductInput,
	): Promise<Result<ProductEntity, DomainError>> {
		const existingResult = await this.productRepo.findById(input.id);
		if (existingResult.isErr()) {
			return err(existingResult.error);
		}

		const existing = existingResult.value;
		if (!existing) {
			return err(DE.notFound("Product", ProductId.unwrap(input.id)));
		}

		const priceOrError = Price.create(input.dto.priceInCents);
		if (priceOrError.isErr()) {
			return err(priceOrError.error);
		}

		const updateResult = existing.update({
			name: input.dto.name,
			description: input.dto.description ?? null,
			price: priceOrError.value,
		});
		if (updateResult.isErr()) {
			return err(updateResult.error);
		}

		const saveResult = await this.productRepo.save(existing);
		if (saveResult.isErr()) {
			return err(saveResult.error);
		}

		return ok(existing);
	}
}
