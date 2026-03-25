import type { UserPermissionEntity } from "../../domain/entities/user-permission.entity.ts";
import type { UserPermissionResponse } from "../schemas/user-permission-response.schema.ts";

export class UserPermissionResponseMapper {
	static toResponse(entity: UserPermissionEntity): UserPermissionResponse {
		return {
			id: entity.idValue,
			userId: entity.userId,
			resource: entity.resource,
			action: entity.action,
			granted: entity.granted,
			createdAt: entity.createdAt.toISOString(),
		};
	}
}
