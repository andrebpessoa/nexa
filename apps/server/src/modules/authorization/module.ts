import type { Auth } from "@nexa/auth";
import { type Role, roles } from "@nexa/auth/permissions";
import { container } from "@/container.ts";
import { CheckUserPermissionUseCase } from "./application/use-cases/check-user-permission.use-case.ts";
import { DeleteUserPermissionUseCase } from "./application/use-cases/delete-user-permission.use-case.ts";
import { ListUserPermissionsUseCase } from "./application/use-cases/list-user-permissions.use-case.ts";
import { UpsertUserPermissionUseCase } from "./application/use-cases/upsert-user-permission.use-case.ts";
import { BetterAuthPermissionPolicyGateway } from "./infra/gateways/better-auth-permission-policy.gateway.ts";
import { DrizzleUserPermissionRepository } from "./infra/repositories/drizzle-user-permission.repository.ts";
import { createAuthorizationGuards } from "./presentation/authorization.guards.ts";
import { authorizationRoutes } from "./presentation/authorization.routes.ts";

container.register("UserPermissionRepository", {
	useClass: DrizzleUserPermissionRepository,
});

container.register("PermissionPolicyGateway", {
	useClass: BetterAuthPermissionPolicyGateway,
});

const isRole = (value: string): value is Role => value in roles;

export const createAuthorizationModule = ({ auth }: { auth: Auth }) => {
	const checkUserPermission = container.resolve(CheckUserPermissionUseCase);
	const guards = createAuthorizationGuards({
		getSession: async (request) => {
			const session = await auth.api.getSession({
				headers: request.headers,
			});

			if (!session) {
				return null;
			}

			const role = session.user.role;
			return {
				user: {
					id: session.user.id,
					role: role && isRole(role) ? role : null,
				},
			};
		},
		checkUserPermission,
	});

	return {
		guards,
		routes: authorizationRoutes({
			upsertUserPermission: container.resolve(UpsertUserPermissionUseCase),
			listUserPermissions: container.resolve(ListUserPermissionsUseCase),
			deleteUserPermission: container.resolve(DeleteUserPermissionUseCase),
			requireAdmin: guards.requireAdmin,
		}),
	};
};
