import "reflect-metadata";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import { UserPermissionEntity } from "../../domain/entities/user-permission.entity.ts";
import type { UserPermissionRepository } from "../../domain/repositories/user-permission.repository.ts";
import { UserPermissionId } from "../../domain/value-objects/user-permission-id.vo.ts";
import { ListUserPermissionsUseCase } from "./list-user-permissions.use-case.ts";

function makeMockRepo(
	overrides: Partial<UserPermissionRepository> = {},
): UserPermissionRepository {
	return {
		findByUserResourceAction: vi.fn(),
		findByUserId: vi.fn(),
		save: vi.fn(),
		delete: vi.fn(),
		...overrides,
	};
}

describe("ListUserPermissionsUseCase", () => {
	it("should return permissions for a user", async () => {
		const userId = crypto.randomUUID();
		const permissions = [
			UserPermissionEntity.create({
				id: UserPermissionId.create(crypto.randomUUID()),
				userId,
				resource: "product",
				action: "create",
				granted: true,
				createdAt: new Date(),
			})._unsafeUnwrap(),
		];
		const mockRepo = makeMockRepo({
			findByUserId: vi.fn().mockResolvedValue(ok(permissions)),
		});
		const useCase = new ListUserPermissionsUseCase(mockRepo);

		const result = await useCase.execute(userId);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toHaveLength(1);
	});

	it("should return empty array when no overrides exist", async () => {
		const mockRepo = makeMockRepo({
			findByUserId: vi.fn().mockResolvedValue(ok([])),
		});
		const useCase = new ListUserPermissionsUseCase(mockRepo);

		const result = await useCase.execute(crypto.randomUUID());

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toHaveLength(0);
	});

	it("should propagate repository error", async () => {
		const mockRepo = makeMockRepo({
			findByUserId: vi
				.fn()
				.mockResolvedValue(err(DomainError.infra("DB error"))),
		});
		const useCase = new ListUserPermissionsUseCase(mockRepo);

		const result = await useCase.execute(crypto.randomUUID());

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
	});
});
