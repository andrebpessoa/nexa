import { describe, expect, it } from "vitest";
import { userPermissionResponseSchema } from "./user-permission.ts";

describe("userPermissionResponseSchema", () => {
	it("should accept a valid user permission response with createdAt as ISO string", () => {
		const valid = {
			id: "550e8400-e29b-41d4-a716-446655440000",
			userId: "550e8400-e29b-41d4-a716-446655440001",
			resource: "product",
			action: "create",
			granted: true,
			createdAt: "2026-03-20T12:00:00.000Z",
		};

		const result = userPermissionResponseSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});

	it("should reject Date objects in createdAt", () => {
		const invalid = {
			id: "550e8400-e29b-41d4-a716-446655440000",
			userId: "550e8400-e29b-41d4-a716-446655440001",
			resource: "product",
			action: "create",
			granted: false,
			createdAt: new Date(),
		};

		const result = userPermissionResponseSchema.safeParse(invalid);
		expect(result.success).toBe(false);
	});

	it("should reject invalid resource-action pairs", () => {
		const invalid = {
			id: "550e8400-e29b-41d4-a716-446655440000",
			userId: "550e8400-e29b-41d4-a716-446655440001",
			resource: "invalid",
			action: "publish",
			granted: true,
			createdAt: "2026-03-20T12:00:00.000Z",
		};

		const result = userPermissionResponseSchema.safeParse(invalid);
		expect(result.success).toBe(false);
	});
});
