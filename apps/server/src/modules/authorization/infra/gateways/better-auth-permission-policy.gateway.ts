import type { Auth } from "@nexa/auth";
import { err, ok, type Result } from "neverthrow";
import { inject, injectable } from "tsyringe";
import { DomainError, type InfraError } from "@/shared/domain/errors/index.ts";
import type {
	PermissionCheckInput,
	PermissionPolicyGateway,
} from "../../application/gateways/permission-policy.gateway.ts";

interface CacheEntry {
	value: boolean;
	expiresAt: number;
}

@injectable()
export class BetterAuthPermissionPolicyGateway
	implements PermissionPolicyGateway
{
	private readonly cache = new Map<string, CacheEntry>();
	private readonly ttlMs = 30_000;
	private readonly cleanupIntervalMs = 60_000;
	private lastCleanup = 0;

	constructor(@inject("Auth") private readonly auth: Auth) {}

	async hasPermission(
		input: PermissionCheckInput,
	): Promise<Result<boolean, InfraError>> {
		const key = `${input.userId}:${input.resource}:${input.action}`;
		const now = Date.now();
		const cached = this.cache.get(key);

		if (cached && cached.expiresAt > now) {
			return ok(cached.value);
		}

		try {
			const response = await this.auth.api.userHasPermission({
				body: {
					userId: input.userId,
					permissions: {
						[input.resource]: [input.action],
					},
				},
			});

			this.cache.set(key, {
				value: response.success,
				expiresAt: now + this.ttlMs,
			});

			if (now - this.lastCleanup > this.cleanupIntervalMs) {
				this.lastCleanup = now;
				for (const [cacheKey, entry] of this.cache.entries()) {
					if (entry.expiresAt <= now) {
						this.cache.delete(cacheKey);
					}
				}
			}

			return ok(response.success);
		} catch (error) {
			return err(
				DomainError.infra("Failed to evaluate base permission policy", error),
			);
		}
	}
}
