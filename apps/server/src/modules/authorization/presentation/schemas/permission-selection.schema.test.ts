import { describe, expect, it } from "vitest";
import { permissionSelectionSchema } from "./permission-selection.schema.ts";

describe("permissionSelectionSchema", () => {
	it("accepts a valid pair", () => {
		expect(
			permissionSelectionSchema.safeParse({
				resource: "product",
				action: "read",
			}).success,
		).toBe(true);
	});

	it("rejects an invalid resource or action", () => {
		expect(
			permissionSelectionSchema.safeParse({
				resource: "invalid",
				action: "read",
			}).success,
		).toBe(false);

		expect(
			permissionSelectionSchema.safeParse({
				resource: "product",
				action: "publish",
			}).success,
		).toBe(false);
	});
});
