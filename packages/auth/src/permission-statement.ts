export const statement = {
	product: ["create", "read", "update", "delete"],
} as const;

export type PermissionStatement = typeof statement;
export type Resource = keyof PermissionStatement;
export type Action<R extends Resource = Resource> =
	PermissionStatement[R][number];
export type PermissionPair = {
	[R in Resource]: { resource: R; action: Action<R> };
}[Resource];

export const isPermissionPair = (value: {
	resource: string;
	action: string;
}): value is PermissionPair => {
	const actions = statement[value.resource as Resource] as
		| readonly string[]
		| undefined;

	return Array.isArray(actions) && actions.includes(value.action);
};
