import {
	boolean,
	index,
	pgTable,
	timestamp,
	unique,
	varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

export const userPermission = pgTable(
	"user_permission",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		userId: varchar("user_id", { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		resource: varchar("resource", { length: 64 }).notNull(),
		action: varchar("action", { length: 64 }).notNull(),
		granted: boolean("granted").notNull(),
		createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
	},
	(table) => [
		unique("user_permission_unique_idx").on(
			table.userId,
			table.resource,
			table.action,
		),
		index("user_permission_user_id_idx").on(table.userId),
	],
);
