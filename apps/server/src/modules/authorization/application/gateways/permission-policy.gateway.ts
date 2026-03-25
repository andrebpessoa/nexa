import type { PermissionPair } from "@nexa/auth/permissions";
import type { Result } from "neverthrow";
import type { InfraError } from "@/shared/domain/errors/index.ts";

export interface PermissionCheckInput extends PermissionPair {
	userId: string;
}

export interface PermissionPolicyGateway {
	hasPermission(
		input: PermissionCheckInput,
	): Promise<Result<boolean, InfraError>>;
}
