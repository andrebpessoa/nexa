import { describe, expect, it } from "vitest";
import { UserPermissionId } from "./user-permission-id.vo.ts";

describe("UserPermissionId", () => {
	it("should create a UserPermissionId from a string", () => {
		const id = UserPermissionId.create("perm-123");
		expect(UserPermissionId.unwrap(id)).toBe("perm-123");
	});

	it("should generate a unique UserPermissionId", () => {
		const id1 = UserPermissionId.generate();
		const id2 = UserPermissionId.generate();
		expect(UserPermissionId.unwrap(id1)).not.toBe(UserPermissionId.unwrap(id2));
	});
});
