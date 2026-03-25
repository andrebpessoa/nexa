declare const __brand: unique symbol;

export type Brand<T, TBrand extends string> = T & {
	readonly [__brand]: TBrand;
};

export const Branded = {
	cast: <T, TBrand extends string>(value: T) => value as Brand<T, TBrand>,
	unwrap: <T, TBrand extends string>(value: Brand<T, TBrand>) => value as T,
} as const;
