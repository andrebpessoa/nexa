import {
	type Action,
	isPermissionPair,
	type PermissionPair,
	type Resource,
	statement,
} from "@nexa/auth/permissions";
import z from "zod";

const permissionResources = Object.keys(statement) as [Resource, ...Resource[]];
const permissionActions = Object.values(statement).flatMap((actions) => [
	...actions,
]) as [Action, ...Action[]];

export const permissionSelectionSchema = z
	.object({
		resource: z.enum(permissionResources),
		action: z.enum(permissionActions),
	})
	.refine(isPermissionPair, {
		message: "Invalid action for resource",
		path: ["action"],
	});

export type PermissionSelection = PermissionPair;
