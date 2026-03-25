import { product } from "@nexa/db/schema/product";
import { and, count, eq, isNull, type SQL } from "drizzle-orm";
import { err, ok, type Result } from "neverthrow";
import { inject, injectable } from "tsyringe";
import { DomainError, type InfraError } from "@/shared/domain/errors/index.ts";
import type {
	PaginatedResult,
	PaginationParams,
} from "@/shared/domain/pagination.ts";
import {
	Cacheable,
	CacheInvalidate,
} from "@/shared/infra/cache/cache.decorators.ts";
import type { ProductEntity } from "../../domain/entities/product.entity.ts";
import type { ProductRepository } from "../../domain/repositories/product.repository.ts";
import type { ProductId } from "../../domain/value-objects/product-id.vo.ts";
import { ProductId as ProductIdVo } from "../../domain/value-objects/product-id.vo.ts";
import { ProductResponseMapper } from "../../presentation/mappers/product-response.mapper.ts";
import { ProductPersistenceMapper } from "../mappers/product-persistence.mapper.ts";

@injectable()
export class DrizzleProductRepository implements ProductRepository {
	constructor(
		@inject("Database") private readonly db: typeof import("@nexa/db")["db"],
	) {}

	@Cacheable({
		ttl: 300,
		serialize: (entity: ProductEntity | null) =>
			entity ? ProductResponseMapper.toResponse(entity) : null,
		hydrate: ProductResponseMapper.fromCacheOrNull,
	})
	async findById(
		id: ProductId,
	): Promise<Result<ProductEntity | null, InfraError>> {
		try {
			const rows = await this.db
				.select()
				.from(product)
				.where(
					and(
						eq(product.id, ProductIdVo.unwrap(id)),
						isNull(product.deletedAt),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) {
				return ok(null);
			}
			const mapped = ProductPersistenceMapper.toDomain(row);
			if (mapped.isErr()) {
				return err(mapped.error);
			}
			return ok(mapped.value);
		} catch (error) {
			return err(DomainError.infra("Failed to find product by id", error));
		}
	}

	async findAll(
		params: PaginationParams,
	): Promise<Result<PaginatedResult<ProductEntity>, InfraError>> {
		return this.paginatedQuery(
			isNull(product.deletedAt),
			params,
			"Failed to list products",
		);
	}

	async findAllActive(
		params: PaginationParams,
	): Promise<Result<PaginatedResult<ProductEntity>, InfraError>> {
		return this.paginatedQuery(
			and(eq(product.active, true), isNull(product.deletedAt)),
			params,
			"Failed to list active products",
		);
	}

	private async paginatedQuery(
		where: SQL | undefined,
		params: PaginationParams,
		errorMessage: string,
	): Promise<Result<PaginatedResult<ProductEntity>, InfraError>> {
		try {
			const [rows, countRows] = await Promise.all([
				this.db
					.select()
					.from(product)
					.where(where)
					.limit(params.limit)
					.offset(params.offset),
				this.db.select({ total: count() }).from(product).where(where),
			]);

			const entities: ProductEntity[] = [];
			for (const row of rows) {
				const mapped = ProductPersistenceMapper.toDomain(row);
				if (mapped.isErr()) {
					return err(mapped.error);
				}
				entities.push(mapped.value);
			}
			return ok({
				items: entities,
				total: Number(countRows[0]?.total ?? 0),
				limit: params.limit,
				offset: params.offset,
			});
		} catch (error) {
			return err(DomainError.infra(errorMessage, error));
		}
	}

	@Cacheable({
		ttl: 300,
		serialize: (entity: ProductEntity | null) =>
			entity ? ProductResponseMapper.toResponse(entity) : null,
		hydrate: ProductResponseMapper.fromCacheOrNull,
	})
	async findActiveById(
		id: ProductId,
	): Promise<Result<ProductEntity | null, InfraError>> {
		try {
			const rows = await this.db
				.select()
				.from(product)
				.where(
					and(
						eq(product.id, ProductIdVo.unwrap(id)),
						eq(product.active, true),
						isNull(product.deletedAt),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) {
				return ok(null);
			}
			const mapped = ProductPersistenceMapper.toDomain(row);
			if (mapped.isErr()) {
				return err(mapped.error);
			}
			return ok(mapped.value);
		} catch (error) {
			return err(
				DomainError.infra("Failed to find active product by id", error),
			);
		}
	}

	@CacheInvalidate()
	async save(entity: ProductEntity): Promise<Result<void, InfraError>> {
		try {
			const data = ProductPersistenceMapper.toPersistence(entity);
			await this.db
				.insert(product)
				.values(data)
				.onDuplicateKeyUpdate({
					set: {
						name: data.name,
						description: data.description,
						priceInCents: data.priceInCents,
						active: data.active,
						deletedAt: data.deletedAt,
					},
				});
			return ok(undefined);
		} catch (error) {
			return err(DomainError.infra("Failed to save product", error));
		}
	}

	@CacheInvalidate()
	async delete(id: ProductId): Promise<Result<void, InfraError>> {
		try {
			await this.db
				.update(product)
				.set({ deletedAt: new Date() })
				.where(eq(product.id, ProductIdVo.unwrap(id)));
			return ok(undefined);
		} catch (error) {
			return err(DomainError.infra("Failed to soft delete product", error));
		}
	}
}
