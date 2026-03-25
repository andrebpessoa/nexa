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
import type { ToggleProductActiveDto } from "../dtos/toggle-product-active.dto.ts";

export interface ToggleProductActiveInput {
	id: ProductId;
	dto: ToggleProductActiveDto;
}

@injectable()
export class ToggleProductActiveUseCase
	implements UseCase<ProductEntity, ToggleProductActiveInput>
{
	constructor(
		@inject("ProductRepository")
		private readonly productRepo: ProductRepository,
	) {}

	async execute(
		input: ToggleProductActiveInput,
	): Promise<Result<ProductEntity, DomainError>> {
		const existingResult = await this.productRepo.findById(input.id);
		if (existingResult.isErr()) {
			return err(existingResult.error);
		}

		const existing = existingResult.value;
		if (!existing) {
			return err(DE.notFound("Product", ProductId.unwrap(input.id)));
		}

		const toggleResult = input.dto.active
			? existing.activate()
			: existing.deactivate();
		if (toggleResult.isErr()) {
			return err(toggleResult.error);
		}

		const saveResult = await this.productRepo.save(existing);
		if (saveResult.isErr()) {
			return err(saveResult.error);
		}

		return ok(existing);
	}
}
