import * as z from "zod";

export const paginationQuerySchema = z.object({
	limit: z.coerce.number().int().positive().max(200).optional(),
	offset: z.coerce.number().int().nonnegative().optional(),
});

export function paginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
	return z.object({
		items: z.array(itemSchema),
		total: z.number().int().nonnegative(),
		limit: z.number().int().positive(),
		offset: z.number().int().nonnegative(),
	});
}
