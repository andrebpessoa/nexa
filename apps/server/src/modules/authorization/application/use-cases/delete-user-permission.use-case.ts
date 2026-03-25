import { err, ok, type Result } from "neverthrow";
import { inject, injectable } from "tsyringe";
import type { UseCase } from "@/shared/application/use-case.base.ts";
import type { DomainError } from "@/shared/domain/errors/index.ts";
import type { UserPermissionRepository } from "../../domain/repositories/user-permission.repository.ts";
import type { UserPermissionId } from "../../domain/value-objects/user-permission-id.vo.ts";

@injectable()
export class DeleteUserPermissionUseCase
	implements UseCase<void, UserPermissionId>
{
	constructor(
		@inject("UserPermissionRepository")
		private readonly repo: UserPermissionRepository,
	) {}

	async execute(id: UserPermissionId): Promise<Result<void, DomainError>> {
		const deleteResult = await this.repo.delete(id);
		if (deleteResult.isErr()) {
			return err(deleteResult.error);
		}
		return ok(undefined);
	}
}
