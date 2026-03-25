import { ProductEntity } from "../../domain/entities/product.entity.ts";
import { Price } from "../../domain/value-objects/price.vo.ts";
import { ProductId } from "../../domain/value-objects/product-id.vo.ts";
import {
	type ProductResponse,
	productResponseSchema,
} from "../schemas/product-response.schema.ts";

export class ProductResponseMapper {
	static toResponse(entity: ProductEntity): ProductResponse {
		return {
			id: entity.idValue,
			name: entity.name,
			description: entity.description,
			priceInCents: entity.price.cents,
			active: entity.active,
			deletedAt: entity.deletedAt?.toISOString() ?? null,
			createdAt: entity.createdAt.toISOString(),
			updatedAt: entity.updatedAt.toISOString(),
		};
	}

	static fromCacheOrNull(plain: unknown): ProductEntity | null {
		if (!isRecord(plain)) {
			return null;
		}

		const parsed = productResponseSchema.safeParse(
			normalizeCachePayload(plain),
		);
		if (!parsed.success) {
			return null;
		}

		const data = parsed.data;
		const price = Price.create(data.priceInCents);
		if (price.isErr()) {
			return null;
		}

		return ProductEntity.reconstitute(ProductId.create(data.id), {
			name: data.name,
			description: data.description,
			price: price.value,
			active: data.active,
			deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt),
		});
	}

	static fromCacheList(plain: unknown): ProductEntity[] {
		if (!Array.isArray(plain)) {
			return [];
		}

		return plain
			.map((item) => ProductResponseMapper.fromCacheOrNull(item))
			.filter((entity): entity is ProductEntity => entity !== null);
	}
}

function normalizeCachePayload(plain: Record<string, unknown>): unknown {
	const candidate = plain;

	return {
		...candidate,
		deletedAt: normalizeDateField(candidate.deletedAt),
		createdAt: normalizeDateField(candidate.createdAt),
		updatedAt: normalizeDateField(candidate.updatedAt),
	};
}

function normalizeDateField(value: unknown): unknown {
	return value instanceof Date ? value.toISOString() : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
