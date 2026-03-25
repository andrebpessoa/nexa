import { type Brand, Branded } from "@/shared/domain/brand.ts";

export type ProductId = Brand<string, "ProductId">;

export const ProductId = {
	create: (value: string): ProductId =>
		Branded.cast<string, "ProductId">(value),
	generate: (): ProductId =>
		Branded.cast<string, "ProductId">(crypto.randomUUID()),
	unwrap: (value: ProductId): string =>
		Branded.unwrap<string, "ProductId">(value),
} as const;
