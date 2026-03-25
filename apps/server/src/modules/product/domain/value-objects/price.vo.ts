import { err, ok, type Result } from "neverthrow";
import {
	DomainError as DE,
	type ValidationError,
} from "@/shared/domain/errors/index.ts";
import { ValueObject } from "@/shared/domain/value-object.base.ts";

export class Price extends ValueObject<number> {
	private constructor(cents: number) {
		super(cents);
	}

	static create(cents: number): Result<Price, ValidationError> {
		if (!Number.isInteger(cents)) {
			return err(
				DE.validation("Price must be an integer (cents)", "priceInCents"),
			);
		}
		if (cents < 0) {
			return err(DE.validation("Price cannot be negative", "priceInCents"));
		}
		return ok(new Price(cents));
	}

	get cents(): number {
		return this.value;
	}

	get reais(): number {
		return this.value / 100;
	}
}
