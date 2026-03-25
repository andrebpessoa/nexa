import { ok, type Result } from "neverthrow";
import { container } from "tsyringe";
import { CACHE_DEFAULTS } from "./cache.config.ts";
import { deserializeResult, serializeResult } from "./cache.serializer.ts";

interface CacheableOptions<TOk> {
	ttl?: number;
	serialize?: (value: TOk) => unknown;
	hydrate?: (raw: unknown) => TOk;
}

interface CacheInvalidateOptions {
	entity?: string;
}

type RedisClient = {
	get(key: string): Promise<string | null>;
	set(key: string, value: string, ex: string, ttl: number): Promise<unknown>;
	scan(
		cursor: string | number,
		...args: Array<string | number>
	): Promise<[string, string[]]>;
	del(...keys: string[]): Promise<unknown>;
	unlink(...keys: string[]): Promise<unknown>;
};

type AsyncResultMethod<
	This,
	Args extends unknown[],
	TResult extends Result<unknown, unknown>,
> = (this: This, ...args: Args) => Promise<TResult>;

type ResultError<TResult extends Result<unknown, unknown>> =
	TResult extends Result<unknown, infer TErr> ? TErr : never;

function buildKey(
	className: string,
	methodName: string,
	args: unknown[],
): string {
	return `${className}:${methodName}:${JSON.stringify(args)}`;
}

function getRedis(): RedisClient | null {
	try {
		return container.resolve<RedisClient>("CacheClient");
	} catch {
		return null;
	}
}

export function Cacheable<TOk>(options?: CacheableOptions<TOk>) {
	const ttl = options?.ttl ?? CACHE_DEFAULTS.ttl;
	const serialize = options?.serialize;
	const hydrate = options?.hydrate;

	return <This, Args extends unknown[], TResult extends Result<TOk, unknown>>(
		_target: object,
		propertyKey: string | symbol,
		descriptor: TypedPropertyDescriptor<AsyncResultMethod<This, Args, TResult>>,
	) => {
		const original = descriptor.value;
		if (!original) {
			return descriptor;
		}

		descriptor.value = async function (
			this: This,
			...args: Args
		): Promise<TResult> {
			const className = this?.constructor?.name ?? "Unknown";
			const methodName = String(propertyKey);
			const key = buildKey(className, methodName, args);

			try {
				const redis = getRedis();
				if (redis) {
					const cached = await redis.get(key);
					if (cached) {
						const deserialized = deserializeResult<TOk>(cached);
						if (deserialized !== null) {
							return ok<TOk, ResultError<TResult>>(
								hydrate ? hydrate(deserialized) : deserialized,
							) as TResult;
						}
					}
				}
			} catch {
				// Redis unavailable — fallback to DB
			}

			const result = await original.apply(this, args);

			try {
				const redis = getRedis();
				if (redis && result.isOk()) {
					const cacheValue = serialize ? serialize(result.value) : result.value;
					const serialized = serializeResult(cacheValue);
					if (serialized.length > 0) {
						await redis.set(key, serialized, "EX", ttl);
					}
				}
			} catch {
				// Redis unavailable — return result without caching
			}

			return result;
		};

		return descriptor;
	};
}

export function CacheInvalidate(options?: CacheInvalidateOptions) {
	return <
		This,
		Args extends unknown[],
		TResult extends Result<unknown, unknown>,
	>(
		_target: object,
		_propertyKey: string | symbol,
		descriptor: TypedPropertyDescriptor<AsyncResultMethod<This, Args, TResult>>,
	) => {
		const original = descriptor.value;
		if (!original) {
			return descriptor;
		}

		descriptor.value = async function (this: This, ...args: Args) {
			const result = await original.apply(this, args);

			if (result.isOk()) {
				const prefix = options?.entity ?? this?.constructor?.name ?? "Unknown";

				try {
					const redis = getRedis();
					if (redis) {
						let cursor = "0";
						do {
							const [nextCursor, keys] = await redis.scan(
								cursor,
								"MATCH",
								`${prefix}:*`,
								"COUNT",
								"100",
							);

							cursor = nextCursor;
							if (keys.length > 0) {
								await redis.unlink(...keys);
							}
						} while (cursor !== "0");
					}
				} catch {
					// Redis unavailable — cache will expire via TTL
				}
			}

			return result;
		};

		return descriptor;
	};
}
