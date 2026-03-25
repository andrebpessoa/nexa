import z from "zod";

export const updateProductDto = z.object({
	name: z.string().trim().min(1).max(255),
	description: z.string().min(1).max(5000).nullable().optional(),
	priceInCents: z.number().int().nonnegative().max(100_000_000),
});

export type UpdateProductDto = z.infer<typeof updateProductDto>;
