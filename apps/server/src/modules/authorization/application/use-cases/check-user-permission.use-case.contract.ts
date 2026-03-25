import type { Result } from "neverthrow";
import type { DomainError, InfraError } from "@/shared/domain/errors/index.ts";
import type { CheckUserPermissionUseCase } from "./check-user-permission.use-case.ts";

type AssertTrue<T extends true> = T;
type AssertFalse<T extends false> = T;
type IsEqual<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;

type ExecuteReturn = Awaited<ReturnType<CheckUserPermissionUseCase["execute"]>>;

type ExecuteReturnsDomainError = AssertTrue<
	IsEqual<ExecuteReturn, Result<boolean, DomainError>>
>;

type ExecuteDoesNotReturnInfraError = AssertFalse<
	IsEqual<ExecuteReturn, Result<boolean, InfraError>>
>;

export type CheckUserPermissionUseCaseContracts = [
	ExecuteReturnsDomainError,
	ExecuteDoesNotReturnInfraError,
];
