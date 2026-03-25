import type { ProductRow } from "@nexa/db/validators/product";
import { err, ok, type Result } from "neverthrow";
import { DomainError, type InfraError } from "@/shared/domain/errors/index.ts";
import { ProductEntity } from "../../domain/entities/product.entity.ts";
import { Price } from "../../domain/value-objects/price.vo.ts";
import { ProductId } from "../../domain/value-objects/product-id.vo.ts";

export class ProductPersistenceMapper {
	static toDomain(row: ProductRow): Result<ProductEntity, InfraError> {
		const priceResult = Price.create(row.priceInCents);
		if (priceResult.isErr()) {
			return err(
				DomainError.infra(
					`Invalid persisted product price for product ${row.id}`,
					priceResult.error,
				),
			);
		}

		return ok(
			ProductEntity.reconstitute(ProductId.create(row.id), {
				name: row.name,
				description: row.description,
				price: priceResult.value,
				active: row.active,
				deletedAt: row.deletedAt,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
			}),
		);
	}

	static toPersistence(entity: ProductEntity) {
		return {
			id: entity.idValue,
			name: entity.name,
			description: entity.description,
			priceInCents: entity.price.cents,
			active: entity.active,
			deletedAt: entity.deletedAt,
		};
	}
}
