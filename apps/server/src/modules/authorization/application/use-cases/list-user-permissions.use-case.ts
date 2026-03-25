import type { Result } from "neverthrow";
import { inject, injectable } from "tsyringe";
import type { UseCase } from "@/shared/application/use-case.base.ts";
import type { DomainError } from "@/shared/domain/errors/index.ts";
import type { UserPermissionEntity } from "../../domain/entities/user-permission.entity.ts";
import type { UserPermissionRepository } from "../../domain/repositories/user-permission.repository.ts";

@injectable()
export class ListUserPermissionsUseCase
	implements UseCase<UserPermissionEntity[], string>
{
	constructor(
		@inject("UserPermissionRepository")
		private readonly repo: UserPermissionRepository,
	) {}

	async execute(
		userId: string,
	): Promise<Result<UserPermissionEntity[], DomainError>> {
		return this.repo.findByUserId(userId);
	}
}
