import { err, ok, type Result } from "neverthrow";
import { Entity } from "@/shared/domain/entity.base.ts";
import {
	DomainError as DE,
	type DomainError,
} from "@/shared/domain/errors/index.ts";
import type { Price } from "../value-objects/price.vo.ts";
import type { ProductId } from "../value-objects/product-id.vo.ts";

export interface ProductProps {
	name: string;
	description: string | null;
	price: Price;
	active: boolean;
	deletedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export class ProductEntity extends Entity<ProductId, ProductProps> {
	private constructor(id: ProductId, props: ProductProps) {
		super(id, props);
	}

	static create(params: {
		id: ProductId;
		name: string;
		description: string | null;
		price: Price;
		active: boolean;
		createdAt: Date;
		updatedAt: Date;
	}): Result<ProductEntity, DomainError> {
		if (params.name.trim().length === 0) {
			return err(DE.validation("Product name cannot be empty", "name"));
		}

		return ok(
			new ProductEntity(params.id, {
				name: params.name.trim(),
				description: params.description,
				price: params.price,
				active: params.active,
				deletedAt: null,
				createdAt: params.createdAt,
				updatedAt: params.updatedAt,
			}),
		);
	}

	static reconstitute(id: ProductId, props: ProductProps): ProductEntity {
		return new ProductEntity(id, props);
	}

	update(params: {
		name: string;
		description: string | null;
		price: Price;
	}): Result<void, DomainError> {
		if (params.name.trim().length === 0) {
			return err(DE.validation("Product name cannot be empty", "name"));
		}

		this.props.name = params.name.trim();
		this.props.description = params.description;
		this.props.price = params.price;
		this.touch();
		return ok(undefined);
	}

	activate(): Result<void, DomainError> {
		if (this.props.deletedAt !== null) {
			return err(DE.validation("Cannot activate a deleted product"));
		}

		this.props.active = true;
		this.touch();
		return ok(undefined);
	}

	deactivate(): Result<void, DomainError> {
		if (this.props.deletedAt !== null) {
			return err(DE.validation("Cannot deactivate a deleted product"));
		}

		this.props.active = false;
		this.touch();
		return ok(undefined);
	}

	softDelete(): Result<void, DomainError> {
		if (this.props.deletedAt !== null) {
			return err(DE.validation("Product is already deleted"));
		}

		this.props.deletedAt = new Date();
		this.props.active = false;
		this.touch();
		return ok(undefined);
	}

	private touch(): void {
		this.props.updatedAt = new Date();
	}

	get name(): string {
		return this.props.name;
	}

	get description(): string | null {
		return this.props.description;
	}

	get price(): Price {
		return this.props.price;
	}

	get active(): boolean {
		return this.props.active;
	}

	get isDeleted(): boolean {
		return this.props.deletedAt !== null;
	}

	get deletedAt(): Date | null {
		return this.props.deletedAt;
	}

	get createdAt(): Date {
		return this.props.createdAt;
	}

	get updatedAt(): Date {
		return this.props.updatedAt;
	}
}
