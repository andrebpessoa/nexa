import z from "zod";

export const toggleProductActiveDto = z.object({ active: z.boolean() });

export type ToggleProductActiveDto = z.infer<typeof toggleProductActiveDto>;
