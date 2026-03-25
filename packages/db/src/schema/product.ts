import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

export const product = pgTable(
	"product",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		name: varchar("name", { length: 255 }).notNull(),
		description: text("description"),
		priceInCents: integer("price_in_cents").notNull(),
		active: boolean("active").default(true).notNull(),
		createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { precision: 3 })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		deletedAt: timestamp("deleted_at", { precision: 3 }),
	},
	(table) => [
		index("product_deleted_at_idx").on(table.deletedAt),
		index("product_active_deleted_idx").on(table.active, table.deletedAt),
	],
);
