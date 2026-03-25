import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import z from "zod";
import { userPermission } from "../schema/user-permission.ts";

export const userPermissionSelectSchema = createSelectSchema(userPermission);
export const userPermissionInsertSchema = createInsertSchema(userPermission);
const permissionStatement = {
	product: ["create", "read", "update", "delete"],
} as const;

type PermissionStatement = typeof permissionStatement;
type Resource = keyof PermissionStatement;
type Action<R extends Resource = Resource> = PermissionStatement[R][number];
type PermissionPair = {
	[R in Resource]: { resource: R; action: Action<R> };
}[Resource];

const permissionResources = Object.keys(permissionStatement) as [
	Resource,
	...Resource[],
];
const permissionActions = Object.values(permissionStatement).flatMap(
	(actions) => [...actions],
) as [Action, ...Action[]];

const isPermissionPair = (value: {
	resource: string;
	action: string;
}): value is PermissionPair => {
	const actions = permissionStatement[value.resource as Resource] as
		| readonly string[]
		| undefined;

	return Array.isArray(actions) && actions.includes(value.action);
};

export const userPermissionResponseSchema = userPermissionSelectSchema
	.extend({
		resource: z.enum(permissionResources),
		action: z.enum(permissionActions),
		createdAt: z.string().datetime(),
	})
	.refine(isPermissionPair, {
		message: "Invalid action for resource",
		path: ["action"],
	});

export type UserPermissionRow = z.infer<typeof userPermissionSelectSchema>;
export type UserPermissionInsertRow = z.infer<
	typeof userPermissionInsertSchema
>;
export type UserPermissionResponse = PermissionPair & {
	id: string;
	userId: string;
	granted: boolean;
	createdAt: string;
};
