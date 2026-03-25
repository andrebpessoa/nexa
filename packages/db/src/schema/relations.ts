import { defineRelations } from "drizzle-orm";
import { account, session, user, verification } from "./auth.ts";
import { product } from "./product.ts";
import { userPermission } from "./user-permission.ts";

export const relations = defineRelations(
	{ user, session, account, verification, userPermission, product },
	(r) => ({
		user: {
			sessions: r.many.session({
				from: r.user.id,
				to: r.session.userId,
			}),
			accounts: r.many.account({
				from: r.user.id,
				to: r.account.userId,
			}),
			permissions: r.many.userPermission({
				from: r.user.id,
				to: r.userPermission.userId,
			}),
		},
		session: {
			user: r.one.user({
				from: r.session.userId,
				to: r.user.id,
				optional: false,
			}),
		},
		account: {
			user: r.one.user({
				from: r.account.userId,
				to: r.user.id,
				optional: false,
			}),
		},
		userPermission: {
			user: r.one.user({
				from: r.userPermission.userId,
				to: r.user.id,
				optional: false,
			}),
		},
	}),
);
