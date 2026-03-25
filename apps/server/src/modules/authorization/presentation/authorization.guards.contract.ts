import type { OptionalHandler } from "elysia";
import type {
	AdminGuard,
	PermissionGuard,
	RequirePermissionGuardFactory,
} from "./authorization.guards.ts";

type ErrorResponse = {
	error: string;
	message: string;
};

type AuthorizationFailureResponses = {
	401: ErrorResponse;
	403: ErrorResponse;
	500: ErrorResponse;
};

type IsAny<T> = 0 extends 1 & T ? true : false;
type AssertFalse<T extends false> = T;
type AssertTrue<T extends true> = T;

type PermissionGuardIsNotAny = AssertFalse<IsAny<PermissionGuard>>;
type AdminGuardIsNotAny = AssertFalse<IsAny<AdminGuard>>;

type PermissionGuardMatchesElysia = AssertTrue<
	PermissionGuard extends OptionalHandler<{
		response: AuthorizationFailureResponses;
	}>
		? true
		: false
>;

type AdminGuardMatchesElysia = AssertTrue<
	AdminGuard extends OptionalHandler<{
		response: Omit<AuthorizationFailureResponses, 500>;
	}>
		? true
		: false
>;

declare const requirePermission: RequirePermissionGuardFactory;

requirePermission("product", "read");
// @ts-expect-error invalid resources must be rejected at compile time
requirePermission("invalid", "read");
// @ts-expect-error invalid actions for a valid resource must be rejected at compile time
requirePermission("product", "publish");

export type AuthorizationGuardContracts = [
	PermissionGuardIsNotAny,
	AdminGuardIsNotAny,
	PermissionGuardMatchesElysia,
	AdminGuardMatchesElysia,
];
