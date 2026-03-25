import { createAccessControl } from "better-auth/plugins/access";
import { statement } from "./permission-statement.ts";

export {
	type Action,
	isPermissionPair,
	type PermissionPair,
	type PermissionStatement,
	type Resource,
	statement,
} from "./permission-statement.ts";

export const ac = createAccessControl(statement);

export const admin = ac.newRole({
	product: ["create", "read", "update", "delete"],
});

export const member = ac.newRole({
	product: ["read"],
});

export const roles = { admin, member } as const;
export type Role = keyof typeof roles;
