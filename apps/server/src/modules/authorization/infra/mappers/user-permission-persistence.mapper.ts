import { isPermissionPair } from "@nexa/auth/permissions";
import type { UserPermissionRow } from "@nexa/db/validators/user-permission";
import { UserPermissionEntity } from "../../domain/entities/user-permission.entity.ts";
import { UserPermissionId } from "../../domain/value-objects/user-permission-id.vo.ts";

export class UserPermissionPersistenceMapper {
	static toDomain(row: UserPermissionRow): UserPermissionEntity {
		const selection = {
			resource: row.resource,
			action: row.action,
		};

		if (!isPermissionPair(selection)) {
			throw new Error(
				`Invalid persisted permission selection: ${row.resource}.${row.action}`,
			);
		}

		return UserPermissionEntity.reconstitute(UserPermissionId.create(row.id), {
			userId: row.userId,
			resource: selection.resource,
			action: selection.action,
			granted: row.granted,
			createdAt: row.createdAt,
		});
	}

	static toPersistence(entity: UserPermissionEntity) {
		return {
			id: entity.idValue,
			userId: entity.userId,
			resource: entity.resource,
			action: entity.action,
			granted: entity.granted,
		};
	}
}
