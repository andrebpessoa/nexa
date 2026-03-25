import { ac } from "@nexa/auth/permissions";
import { env } from "@nexa/env/admin";
import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: env.VITE_SERVER_URL,
	plugins: [
		adminClient({
			ac,
		}),
	],
});
