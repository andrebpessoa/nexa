import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import z from "zod";
import { product } from "../schema/product.ts";

export const productSelectSchema = createSelectSchema(product);
export const productInsertSchema = createInsertSchema(product);
export const productResponseSchema = productSelectSchema.extend({
	deletedAt: z.iso.datetime().nullable(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export type ProductRow = z.infer<typeof productSelectSchema>;
export type ProductInsertRow = z.infer<typeof productInsertSchema>;
export type ProductResponse = z.infer<typeof productResponseSchema>;
