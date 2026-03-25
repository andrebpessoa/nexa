import { err, ok, type Result } from "neverthrow";
import { inject, injectable } from "tsyringe";
import type { UseCase } from "@/shared/application/use-case.base.ts";
import type { DomainError } from "@/shared/domain/errors/index.ts";
import type { UserPermissionRepository } from "../../domain/repositories/user-permission.repository.ts";
import type {
	PermissionCheckInput,
	PermissionPolicyGateway,
} from "../gateways/permission-policy.gateway.ts";

@injectable()
export class CheckUserPermissionUseCase
	implements UseCase<boolean, PermissionCheckInput>
{
	constructor(
		@inject("UserPermissionRepository")
		private readonly repo: UserPermissionRepository,
		@inject("PermissionPolicyGateway")
		private readonly permissionPolicyGateway: PermissionPolicyGateway,
	) {}

	async execute(
		input: PermissionCheckInput,
	): Promise<Result<boolean, DomainError>> {
		const overrideResult = await this.repo.findByUserResourceAction(
			input.userId,
			input,
		);
		if (overrideResult.isErr()) {
			return err(overrideResult.error);
		}

		const override = overrideResult.value;
		if (override) {
			return ok(override.granted);
		}

		return this.permissionPolicyGateway.hasPermission(input);
	}
}
