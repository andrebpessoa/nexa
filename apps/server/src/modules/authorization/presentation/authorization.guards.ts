import type { PermissionPair, Role } from "@nexa/auth/permissions";
import {
	type ElysiaCustomStatusResponse,
	type MaybePromise,
	status,
} from "elysia";
import { toErrorResponse } from "@/shared/domain/errors/index.ts";
import type { CheckUserPermissionUseCase } from "../application/use-cases/check-user-permission.use-case.ts";

type GuardSession = {
	user: {
		id: string;
		role?: Role | null;
	};
};

type AuthorizationErrorResponse = {
	error: string;
	message: string;
};

type GuardErrorResponse<Code extends number> = ElysiaCustomStatusResponse<
	Code,
	AuthorizationErrorResponse
>;

type GuardContext = {
	request: Request;
};

export type PermissionGuard = (
	context: GuardContext,
) => MaybePromise<
	| GuardErrorResponse<401>
	| GuardErrorResponse<403>
	| GuardErrorResponse<500>
	| undefined
>;
export type AdminGuard = (
	context: GuardContext,
) => MaybePromise<
	GuardErrorResponse<401> | GuardErrorResponse<403> | undefined
>;
type PermissionAction<R extends PermissionPair["resource"]> = Extract<
	PermissionPair,
	{ resource: R }
>["action"];

export type RequirePermissionGuardFactory = <
	R extends PermissionPair["resource"],
>(
	resource: R,
	action: PermissionAction<R>,
) => PermissionGuard;
export type RequireAdminGuardFactory = () => AdminGuard;

interface AuthorizationGuardDeps {
	getSession(request: Request): Promise<GuardSession | null>;
	checkUserPermission: Pick<CheckUserPermissionUseCase, "execute">;
}

export interface AuthorizationGuards {
	requirePermission: RequirePermissionGuardFactory;
	requireAdmin: RequireAdminGuardFactory;
}

export const createAuthorizationGuards = (
	deps: AuthorizationGuardDeps,
): AuthorizationGuards => {
	const extractSession = async (request: Request) => {
		const session = await deps.getSession(request);
		if (!session) {
			return {
				error: status(401, {
					error: "UNAUTHORIZED",
					message: "Authentication required",
				}) as GuardErrorResponse<401>,
			} as const;
		}
		return { session } as const;
	};

	return {
		requirePermission:
			<R extends PermissionPair["resource"]>(
				resource: R,
				action: PermissionAction<R>,
			) =>
			async ({ request }: GuardContext) => {
				const extraction = await extractSession(request);
				if ("error" in extraction) return extraction.error;
				const { session } = extraction;

				const result = await deps.checkUserPermission.execute({
					userId: session.user.id,
					resource,
					action,
				});

				return result.match(
					(allowed) => {
						if (allowed) {
							return undefined;
						}

						return status(403, {
							error: "FORBIDDEN",
							message: "You do not have permission to perform this action",
						});
					},
					(error) => status(500, toErrorResponse(error)),
				);
			},

		requireAdmin:
			() =>
			async ({ request }: GuardContext) => {
				const extraction = await extractSession(request);
				if ("error" in extraction) return extraction.error;
				const { session } = extraction;

				if (session.user.role !== "admin") {
					return status(403, {
						error: "FORBIDDEN",
						message: "Admin access required",
					});
				}
			},
	};
};
