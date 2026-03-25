import { db } from "@nexa/db";
import * as schema from "@nexa/db/schema/index";
import { env } from "@nexa/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin as adminPlugin } from "better-auth/plugins";
import { ac, admin, member } from "./permissions.ts";

export function createAuth() {
	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",
			schema,
		}),
		trustedOrigins: env.CORS_ORIGIN,
		emailAndPassword: {
			enabled: true,
			sendResetPassword: async ({ user, url }) => {
				console.log(
					`[auth] Reset password requested for ${user.email}: ${url}`,
				);
			},
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
				httpOnly: true,
			},
		},
		plugins: [
			adminPlugin({
				ac,
				roles: {
					admin,
					member,
				},
				defaultRole: "member",
			}),
		],
	});
}

export type Auth = ReturnType<typeof createAuth>;
