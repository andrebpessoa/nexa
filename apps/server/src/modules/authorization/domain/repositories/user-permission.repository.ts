import type { PermissionPair } from "@nexa/auth/permissions";
import type { Result } from "neverthrow";
import type { InfraError } from "@/shared/domain/errors/index.ts";
import type { UserPermissionEntity } from "../entities/user-permission.entity.ts";
import type { UserPermissionId } from "../value-objects/user-permission-id.vo.ts";

export interface UserPermissionRepository {
	findByUserResourceAction(
		userId: string,
		permission: PermissionPair,
	): Promise<Result<UserPermissionEntity | null, InfraError>>;
	findByUserId(
		userId: string,
	): Promise<Result<UserPermissionEntity[], InfraError>>;
	save(permission: UserPermissionEntity): Promise<Result<void, InfraError>>;
	delete(id: UserPermissionId): Promise<Result<void, InfraError>>;
}
