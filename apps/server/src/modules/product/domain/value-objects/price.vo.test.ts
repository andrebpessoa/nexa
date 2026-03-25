import { describe, expect, it } from "vitest";
import { Price } from "./price.vo.ts";

describe("Price", () => {
	it("should create a valid price from cents", () => {
		const result = Price.create(1500);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().cents).toBe(1500);
	});

	it("should create a price of zero", () => {
		const result = Price.create(0);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().cents).toBe(0);
	});

	it("should convert cents to reais", () => {
		const price = Price.create(1599)._unsafeUnwrap();

		expect(price.reais).toBe(15.99);
	});

	it("should reject negative price", () => {
		const result = Price.create(-100);

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("ValidationError");
		expect(result._unsafeUnwrapErr().message).toContain("negative");
	});

	it("should reject non-integer price", () => {
		const result = Price.create(15.5);

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("ValidationError");
		expect(result._unsafeUnwrapErr().message).toContain("integer");
	});

	it("should compare equal prices", () => {
		const price1 = Price.create(1000)._unsafeUnwrap();
		const price2 = Price.create(1000)._unsafeUnwrap();

		expect(price1.equals(price2)).toBe(true);
	});

	it("should compare different prices", () => {
		const price1 = Price.create(1000)._unsafeUnwrap();
		const price2 = Price.create(2000)._unsafeUnwrap();

		expect(price1.equals(price2)).toBe(false);
	});
});
