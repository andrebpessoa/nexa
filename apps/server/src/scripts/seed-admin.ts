import type { Auth } from "@nexa/auth";
import { db } from "@nexa/db";
import { user } from "@nexa/db/schema/auth";
import { container } from "../container.ts";

const auth = container.resolve<Auth>("Auth");

import { eq } from "drizzle-orm";

const email = process.argv[2];

if (!email) {
	console.error("Usage: bun run seed:admin <email>");
	process.exit(1);
}

const rows = await db
	.select({ id: user.id })
	.from(user)
	.where(eq(user.email, email))
	.limit(1);

const foundUser = rows[0];
if (!foundUser) {
	console.error(`User with email "${email}" not found.`);
	process.exit(1);
}

await auth.api.setRole({
	headers: new Headers(),
	body: {
		userId: foundUser.id,
		role: "admin",
	},
});

console.log(`User "${email}" has been promoted to admin.`);
process.exit(0);
