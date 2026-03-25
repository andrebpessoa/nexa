import "reflect-metadata";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import { UserPermissionEntity } from "../../domain/entities/user-permission.entity.ts";
import type { UserPermissionRepository } from "../../domain/repositories/user-permission.repository.ts";
import { UserPermissionId } from "../../domain/value-objects/user-permission-id.vo.ts";
import type { PermissionPolicyGateway } from "../gateways/permission-policy.gateway.ts";
import { CheckUserPermissionUseCase } from "./check-user-permission.use-case.ts";

function makeOverride(granted: boolean) {
	return UserPermissionEntity.reconstitute(UserPermissionId.create("perm-1"), {
		userId: crypto.randomUUID(),
		resource: "product",
		action: "read",
		granted,
		createdAt: new Date("2026-03-20T10:00:00.000Z"),
	});
}

describe("CheckUserPermissionUseCase", () => {
	it("returns the override decision when one exists", async () => {
		const repo: UserPermissionRepository = {
			findByUserResourceAction: vi
				.fn()
				.mockResolvedValue(ok(makeOverride(false))),
			findByUserId: vi.fn(),
			save: vi.fn(),
			delete: vi.fn(),
		};

		const gateway: PermissionPolicyGateway = {
			hasPermission: vi.fn(),
		};

		const useCase = new CheckUserPermissionUseCase(repo, gateway);
		const result = await useCase.execute({
			userId: crypto.randomUUID(),
			resource: "product",
			action: "read",
		});

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toBe(false);
		expect(gateway.hasPermission).not.toHaveBeenCalled();
	});

	it("falls back to the base policy when no override exists", async () => {
		const repo: UserPermissionRepository = {
			findByUserResourceAction: vi.fn().mockResolvedValue(ok(null)),
			findByUserId: vi.fn(),
			save: vi.fn(),
			delete: vi.fn(),
		};

		const gateway: PermissionPolicyGateway = {
			hasPermission: vi.fn().mockResolvedValue(ok(true)),
		};

		const useCase = new CheckUserPermissionUseCase(repo, gateway);
		const result = await useCase.execute({
			userId: crypto.randomUUID(),
			resource: "product",
			action: "read",
		});

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toBe(true);
	});

	it("propagates infra errors from the repository", async () => {
		const repo: UserPermissionRepository = {
			findByUserResourceAction: vi
				.fn()
				.mockResolvedValue(err(DomainError.infra("DB unavailable"))),
			findByUserId: vi.fn(),
			save: vi.fn(),
			delete: vi.fn(),
		};

		const gateway: PermissionPolicyGateway = {
			hasPermission: vi.fn(),
		};

		const useCase = new CheckUserPermissionUseCase(repo, gateway);
		const result = await useCase.execute({
			userId: crypto.randomUUID(),
			resource: "product",
			action: "read",
		});

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
	});
});
