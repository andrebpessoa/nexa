import { err, ok, type Result } from "neverthrow";
import { inject, injectable } from "tsyringe";
import type { UseCase } from "@/shared/application/use-case.base.ts";
import type { DomainError } from "@/shared/domain/errors/index.ts";
import { UserPermissionEntity } from "../../domain/entities/user-permission.entity.ts";
import type { UserPermissionRepository } from "../../domain/repositories/user-permission.repository.ts";
import { UserPermissionId } from "../../domain/value-objects/user-permission-id.vo.ts";
import type { UpsertUserPermissionDto } from "../dtos/upsert-user-permission.dto.ts";

@injectable()
export class UpsertUserPermissionUseCase
	implements UseCase<UserPermissionEntity, UpsertUserPermissionDto>
{
	constructor(
		@inject("UserPermissionRepository")
		private readonly repo: UserPermissionRepository,
	) {}

	async execute(
		dto: UpsertUserPermissionDto,
	): Promise<Result<UserPermissionEntity, DomainError>> {
		const existingResult = await this.repo.findByUserResourceAction(
			dto.userId,
			dto,
		);
		if (existingResult.isErr()) {
			return err(existingResult.error);
		}

		const existing = existingResult.value;
		if (existing) {
			existing.setGranted(dto.granted);

			const saveExistingResult = await this.repo.save(existing);
			if (saveExistingResult.isErr()) {
				return err(saveExistingResult.error);
			}

			return ok(existing);
		}

		const entityOrError = UserPermissionEntity.create({
			id: UserPermissionId.generate(),
			userId: dto.userId,
			resource: dto.resource,
			action: dto.action,
			granted: dto.granted,
			createdAt: new Date(),
		});
		if (entityOrError.isErr()) {
			return err(entityOrError.error);
		}

		const entity = entityOrError.value;

		const saveResult = await this.repo.save(entity);
		if (saveResult.isErr()) {
			return err(saveResult.error);
		}

		return ok(entity);
	}
}
