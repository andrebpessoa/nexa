import { db } from "@nexa/db";
import * as schema from "@nexa/db/schema/index";
import { env } from "@nexa/env/server";
import type { EmailClient } from "@nexa/transactional";
import { pretty, render } from "@nexa/transactional";
import { ResetPasswordEmail } from "@nexa/transactional/emails/reset-password";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin as adminPlugin } from "better-auth/plugins";
import { ac, admin, member } from "./permissions.ts";

export interface AuthDependencies {
	emailClient: EmailClient;
}

export function createAuth({ emailClient }: AuthDependencies) {
	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "mysql",
			schema,
		}),
		trustedOrigins: env.CORS_ORIGIN,
		emailAndPassword: {
			enabled: true,
			sendResetPassword: async ({ user, url }) => {
				const html = await pretty(
					await render(ResetPasswordEmail({ url, userName: user.name })),
				);
				await emailClient.send({
					to: user.email,
					subject: "Redefina sua senha — Nexa",
					html,
				});
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
