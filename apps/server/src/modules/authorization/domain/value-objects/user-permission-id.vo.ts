import { type Brand, Branded } from "@/shared/domain/brand.ts";

export type UserPermissionId = Brand<string, "UserPermissionId">;

export const UserPermissionId = {
	create: (value: string): UserPermissionId =>
		Branded.cast<string, "UserPermissionId">(value),
	generate: (): UserPermissionId =>
		Branded.cast<string, "UserPermissionId">(crypto.randomUUID()),
	unwrap: (value: UserPermissionId): string =>
		Branded.unwrap<string, "UserPermissionId">(value),
} as const;
