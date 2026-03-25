import { Elysia } from "elysia";
import * as z from "zod";
import { toErrorResponse, toHttpStatus } from "@/shared/domain/errors/index.ts";
import { jsonResponse } from "@/shared/presentation/helpers/json-response.ts";
import { errorResponseSchema } from "@/shared/presentation/schemas/error-response.schema.ts";
import { upsertUserPermissionDto } from "../application/dtos/upsert-user-permission.dto.ts";
import type { DeleteUserPermissionUseCase } from "../application/use-cases/delete-user-permission.use-case.ts";
import type { ListUserPermissionsUseCase } from "../application/use-cases/list-user-permissions.use-case.ts";
import type { UpsertUserPermissionUseCase } from "../application/use-cases/upsert-user-permission.use-case.ts";
import { UserPermissionId } from "../domain/value-objects/user-permission-id.vo.ts";
import type { RequireAdminGuardFactory } from "./authorization.guards.ts";
import { UserPermissionResponseMapper } from "./mappers/user-permission-response.mapper.ts";
import { userPermissionResponseSchema } from "./schemas/user-permission-response.schema.ts";

interface AuthorizationRouteDeps {
	upsertUserPermission: UpsertUserPermissionUseCase;
	listUserPermissions: ListUserPermissionsUseCase;
	deleteUserPermission: DeleteUserPermissionUseCase;
	requireAdmin: RequireAdminGuardFactory;
}

export const authorizationRoutes = (deps: AuthorizationRouteDeps) =>
	new Elysia({ prefix: "/api/admin/permissions" })
		.post(
			"/",
			async ({ body }) => {
				const result = await deps.upsertUserPermission.execute(body);

				return result.match(
					(permission) =>
						jsonResponse(
							UserPermissionResponseMapper.toResponse(permission),
							201,
						),
					(error) => jsonResponse(toErrorResponse(error), toHttpStatus(error)),
				);
			},
			{
				beforeHandle: [deps.requireAdmin()],
				detail: {
					tags: ["admin"],
					summary: "Create or update a user permission override",
				},
				body: upsertUserPermissionDto,
				response: {
					201: userPermissionResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					500: errorResponseSchema,
				},
			},
		)
		.get(
			"/:userId",
			async ({ params }) => {
				const result = await deps.listUserPermissions.execute(params.userId);

				return result.match(
					(permissions) =>
						jsonResponse(
							permissions.map(UserPermissionResponseMapper.toResponse),
						),
					(error) => jsonResponse(toErrorResponse(error), toHttpStatus(error)),
				);
			},
			{
				beforeHandle: [deps.requireAdmin()],
				detail: {
					tags: ["admin"],
					summary: "List permission overrides for a user",
				},
				response: {
					200: z.array(userPermissionResponseSchema),
					401: errorResponseSchema,
					403: errorResponseSchema,
					500: errorResponseSchema,
				},
			},
		)
		.delete(
			"/:id",
			async ({ params }) => {
				const result = await deps.deleteUserPermission.execute(
					UserPermissionId.create(params.id),
				);

				return result.match(
					() => jsonResponse({ success: true }),
					(error) => jsonResponse(toErrorResponse(error), toHttpStatus(error)),
				);
			},
			{
				beforeHandle: [deps.requireAdmin()],
				detail: {
					tags: ["admin"],
					summary: "Delete a permission override",
				},
				response: {
					200: z.object({ success: z.boolean() }),
					401: errorResponseSchema,
					403: errorResponseSchema,
					500: errorResponseSchema,
				},
			},
		);
