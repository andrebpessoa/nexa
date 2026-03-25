import type { PermissionPair } from "@nexa/auth/permissions";
import { describe, expect, it } from "vitest";
import { UserPermissionId } from "../value-objects/user-permission-id.vo.ts";
import { UserPermissionEntity } from "./user-permission.entity.ts";

describe("UserPermissionEntity", () => {
	const now = new Date("2026-03-20T12:00:00.000Z");

	function createValid(
		overrides: Partial<{
			id: string;
			userId: string;
			resource: PermissionPair["resource"];
			action: PermissionPair["action"];
			granted: boolean;
		}> = {},
	) {
		return UserPermissionEntity.create({
			id: UserPermissionId.create(overrides.id ?? "perm-1"),
			userId: overrides.userId ?? "user-1",
			resource: overrides.resource ?? "product",
			action: overrides.action ?? "create",
			granted: overrides.granted ?? true,
			createdAt: now,
		});
	}

	describe("create", () => {
		it("should create a user permission with all properties", () => {
			const result = createValid();

			expect(result.isOk()).toBe(true);
			const permission = result._unsafeUnwrap();
			expect(permission.idValue).toBe("perm-1");
			expect(permission.userId).toBe("user-1");
			expect(permission.resource).toBe("product");
			expect(permission.action).toBe("create");
			expect(permission.granted).toBe(true);
		});

		it("should preserve a valid permission pair", () => {
			const result = createValid({
				resource: "product",
				action: "update",
			});

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap().resource).toBe("product");
			expect(result._unsafeUnwrap().action).toBe("update");
		});
	});

	describe("equals", () => {
		it("should compare by id", () => {
			const p1 = createValid({ id: "same" })._unsafeUnwrap();
			const p2 = createValid({ id: "same", action: "delete" })._unsafeUnwrap();

			expect(p1.equals(p2)).toBe(true);
		});

		it("should not be equal with different ids", () => {
			const p1 = createValid({ id: "perm-1" })._unsafeUnwrap();
			const p2 = createValid({ id: "perm-2" })._unsafeUnwrap();

			expect(p1.equals(p2)).toBe(false);
		});
	});

	describe("setGranted", () => {
		it("changes only the granted flag when updating an override", () => {
			const entity = UserPermissionEntity.create({
				id: UserPermissionId.create("perm-1"),
				userId: crypto.randomUUID(),
				resource: "product",
				action: "update",
				granted: false,
				createdAt: new Date("2026-03-20T10:00:00.000Z"),
			})._unsafeUnwrap();

			entity.setGranted(true);

			expect(entity.granted).toBe(true);
		});
	});
});
