import type { PermissionPair } from "@nexa/auth/permissions";
import z from "zod";
import { permissionSelectionSchema } from "../../presentation/schemas/permission-selection.schema.ts";

export const upsertUserPermissionDto = permissionSelectionSchema.extend({
	userId: z.string().uuid(),
	granted: z.boolean(),
});

export type UpsertUserPermissionDto = PermissionPair & {
	userId: string;
	granted: boolean;
};
