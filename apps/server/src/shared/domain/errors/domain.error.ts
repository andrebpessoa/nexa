export interface ValidationErr {
	readonly _tag: "ValidationError";
	readonly message: string;
	readonly field?: string;
}

export interface NotFoundErr {
	readonly _tag: "NotFoundError";
	readonly message: string;
	readonly entity: string;
	readonly id: string;
}

export interface ConflictErr {
	readonly _tag: "ConflictError";
	readonly message: string;
}

export interface InfraErr {
	readonly _tag: "InfraError";
	readonly message: string;
	readonly cause?: unknown;
}

export type DomainError = ValidationErr | NotFoundErr | ConflictErr | InfraErr;

export type ValidationError = ValidationErr;
export type NotFoundError = NotFoundErr;
export type ConflictError = ConflictErr;
export type InfraError = InfraErr;

export const DomainError = {
	validation: (message: string, field?: string): ValidationErr => ({
		_tag: "ValidationError",
		message,
		field,
	}),

	notFound: (entity: string, id: string): NotFoundErr => ({
		_tag: "NotFoundError",
		message: `${entity} "${id}" not found`,
		entity,
		id,
	}),

	conflict: (message: string): ConflictErr => ({
		_tag: "ConflictError",
		message,
	}),

	infra: (message: string, cause?: unknown): InfraErr => ({
		_tag: "InfraError",
		message,
		cause,
	}),
} as const;

function assertNever(value: never): never {
	throw new Error(`Unhandled domain error: ${JSON.stringify(value)}`);
}

export function toHttpStatus(error: DomainError): number {
	switch (error._tag) {
		case "ValidationError":
			return 400;
		case "NotFoundError":
			return 404;
		case "ConflictError":
			return 409;
		case "InfraError":
			return 500;
		default:
			return assertNever(error);
	}
}

export function toErrorResponse(error: DomainError) {
	return {
		error: error._tag,
		message: error.message,
	};
}
