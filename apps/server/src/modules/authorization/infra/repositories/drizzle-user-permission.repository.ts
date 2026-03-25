import type { PermissionPair } from "@nexa/auth/permissions";
import { userPermission } from "@nexa/db/schema/user-permission";
import { and, eq } from "drizzle-orm";
import { err, ok, type Result } from "neverthrow";
import { inject, injectable } from "tsyringe";
import { DomainError, type InfraError } from "@/shared/domain/errors/index.ts";
import type { UserPermissionEntity } from "../../domain/entities/user-permission.entity.ts";
import type { UserPermissionRepository } from "../../domain/repositories/user-permission.repository.ts";
import type { UserPermissionId } from "../../domain/value-objects/user-permission-id.vo.ts";
import { UserPermissionId as UserPermissionIdVo } from "../../domain/value-objects/user-permission-id.vo.ts";
import { UserPermissionPersistenceMapper } from "../mappers/user-permission-persistence.mapper.ts";

@injectable()
export class DrizzleUserPermissionRepository
	implements UserPermissionRepository
{
	constructor(
		@inject("Database") private readonly db: typeof import("@nexa/db")["db"],
	) {}

	async findByUserResourceAction(
		userId: string,
		permission: PermissionPair,
	): Promise<Result<UserPermissionEntity | null, InfraError>> {
		try {
			const rows = await this.db
				.select()
				.from(userPermission)
				.where(
					and(
						eq(userPermission.userId, userId),
						eq(userPermission.resource, permission.resource),
						eq(userPermission.action, permission.action),
					),
				)
				.limit(1);

			const row = rows[0];
			if (!row) {
				return ok(null);
			}

			return ok(UserPermissionPersistenceMapper.toDomain(row));
		} catch (error) {
			return err(
				DomainError.infra("Failed to find user permission override", error),
			);
		}
	}

	async findByUserId(
		userId: string,
	): Promise<Result<UserPermissionEntity[], InfraError>> {
		try {
			const rows = await this.db
				.select()
				.from(userPermission)
				.where(eq(userPermission.userId, userId));

			return ok(rows.map(UserPermissionPersistenceMapper.toDomain));
		} catch (error) {
			return err(DomainError.infra("Failed to list user permissions", error));
		}
	}

	async save(entity: UserPermissionEntity): Promise<Result<void, InfraError>> {
		try {
			const data = UserPermissionPersistenceMapper.toPersistence(entity);
			await this.db
				.insert(userPermission)
				.values(data)
				.onConflictDoUpdate({
					target: [
						userPermission.userId,
						userPermission.resource,
						userPermission.action,
					],
					set: { granted: data.granted },
				});
			return ok(undefined);
		} catch (error) {
			return err(DomainError.infra("Failed to save user permission", error));
		}
	}

	async delete(id: UserPermissionId): Promise<Result<void, InfraError>> {
		try {
			await this.db
				.delete(userPermission)
				.where(eq(userPermission.id, UserPermissionIdVo.unwrap(id)));
			return ok(undefined);
		} catch (error) {
			return err(DomainError.infra("Failed to delete user permission", error));
		}
	}
}
