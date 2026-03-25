import { ProductEntity } from "../../src/modules/product/domain/entities/product.entity.ts";
import { Price } from "../../src/modules/product/domain/value-objects/price.vo.ts";
import { ProductId } from "../../src/modules/product/domain/value-objects/product-id.vo.ts";

interface ProductOverrides {
	id?: string;
	name?: string;
	description?: string | null;
	priceInCents?: number;
	active?: boolean;
	createdAt?: Date;
	updatedAt?: Date;
}

export function makeProduct(overrides: ProductOverrides = {}): ProductEntity {
	const now = new Date();
	return ProductEntity.create({
		id: ProductId.create(overrides.id ?? crypto.randomUUID()),
		name: overrides.name ?? "Test Product",
		description: overrides.description ?? null,
		price: Price.create(overrides.priceInCents ?? 1000)._unsafeUnwrap(),
		active: overrides.active ?? true,
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
	})._unsafeUnwrap();
}
