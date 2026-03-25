export interface PaginationParams {
	readonly limit: number;
	readonly offset: number;
}

export interface PaginatedResult<T> {
	readonly items: readonly T[];
	readonly total: number;
	readonly limit: number;
	readonly offset: number;
}

export function hasNextPage(result: PaginatedResult<unknown>): boolean {
	return result.offset + result.items.length < result.total;
}
