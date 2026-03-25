import { describe, expect, it } from "vitest";
import { UserPermissionEntity } from "../../domain/entities/user-permission.entity.ts";
import { UserPermissionId } from "../../domain/value-objects/user-permission-id.vo.ts";
import { UserPermissionResponseMapper } from "./user-permission-response.mapper.ts";

describe("UserPermissionResponseMapper", () => {
	it("serializes a user permission to the HTTP contract", () => {
		const entity = UserPermissionEntity.create({
			id: UserPermissionId.create("perm-1"),
			userId: crypto.randomUUID(),
			resource: "product",
			action: "delete",
			granted: false,
			createdAt: new Date("2026-03-20T10:00:00.000Z"),
		})._unsafeUnwrap();

		expect(UserPermissionResponseMapper.toResponse(entity)).toEqual({
			id: "perm-1",
			userId: entity.userId,
			resource: "product",
			action: "delete",
			granted: false,
			createdAt: "2026-03-20T10:00:00.000Z",
		});
	});
});
