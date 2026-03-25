import {
	boolean,
	index,
	int,
	mysqlTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/mysql-core";

export const product = mysqlTable(
	"product",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		name: varchar("name", { length: 255 }).notNull(),
		description: text("description"),
		priceInCents: int("price_in_cents").notNull(),
		active: boolean("active").default(true).notNull(),
		createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { fsp: 3 })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		deletedAt: timestamp("deleted_at", { fsp: 3 }),
	},
	(table) => [
		index("product_deleted_at_idx").on(table.deletedAt),
		index("product_active_deleted_idx").on(table.active, table.deletedAt),
	],
);
