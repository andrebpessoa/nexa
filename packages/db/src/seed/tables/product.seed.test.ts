import { describe, expect, it } from "vitest";
import { productSeedPreset } from "./product.seed.ts";

describe("productSeedPreset", () => {
	it("defines a 10-product catalog with unique names and a valid price range", () => {
		expect(productSeedPreset.count).toBe(10);
		expect(productSeedPreset.names).toHaveLength(10);
		expect(new Set(productSeedPreset.names).size).toBe(10);
		expect(productSeedPreset.defaultActive).toBe(true);
		expect(productSeedPreset.minPriceInCents).toBeGreaterThan(0);
		expect(productSeedPreset.maxPriceInCents).toBeGreaterThan(
			productSeedPreset.minPriceInCents,
		);
	});
});
