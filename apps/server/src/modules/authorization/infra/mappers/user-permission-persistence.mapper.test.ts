import type { UserPermissionRow } from "@nexa/db/validators/user-permission";
import { describe, expect, it } from "vitest";
import { UserPermissionPersistenceMapper } from "./user-permission-persistence.mapper.ts";

const row: UserPermissionRow = {
	id: "perm-1",
	userId: crypto.randomUUID(),
	resource: "product",
	action: "read",
	granted: true,
	createdAt: new Date("2026-03-20T10:00:00.000Z"),
};

describe("UserPermissionPersistenceMapper", () => {
	it("maps a row into a domain entity", () => {
		const entity = UserPermissionPersistenceMapper.toDomain(row);

		expect(entity.idValue).toBe("perm-1");
		expect(entity.resource).toBe("product");
	});
});
