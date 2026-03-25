import type { Result } from "neverthrow";
import type { InfraError } from "@/shared/domain/errors/index.ts";
import type {
	PaginatedResult,
	PaginationParams,
} from "@/shared/domain/pagination.ts";
import type { ProductEntity } from "../entities/product.entity.ts";
import type { ProductId } from "../value-objects/product-id.vo.ts";

export interface ProductRepository {
	findById(id: ProductId): Promise<Result<ProductEntity | null, InfraError>>;
	findAll(
		params: PaginationParams,
	): Promise<Result<PaginatedResult<ProductEntity>, InfraError>>;
	findAllActive(
		params: PaginationParams,
	): Promise<Result<PaginatedResult<ProductEntity>, InfraError>>;
	findActiveById(
		id: ProductId,
	): Promise<Result<ProductEntity | null, InfraError>>;
	save(product: ProductEntity): Promise<Result<void, InfraError>>;
	delete(id: ProductId): Promise<Result<void, InfraError>>;
}
