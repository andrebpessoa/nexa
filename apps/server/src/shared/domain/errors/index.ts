import {
	type ConflictError,
	type DomainError as DomainErrorType,
	DomainError as DomainErrorValue,
	type InfraError,
	type NotFoundError,
	toErrorResponse,
	toHttpStatus,
	type ValidationError,
} from "./domain.error.ts";

export const DomainError = DomainErrorValue;
export { toErrorResponse, toHttpStatus };
export type { ConflictError, InfraError, NotFoundError, ValidationError };
export type DomainError = DomainErrorType;
