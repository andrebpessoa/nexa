import "reflect-metadata";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import { UserPermissionEntity } from "../../domain/entities/user-permission.entity.ts";
import type { UserPermissionRepository } from "../../domain/repositories/user-permission.repository.ts";
import { UserPermissionId } from "../../domain/value-objects/user-permission-id.vo.ts";
import { UpsertUserPermissionUseCase } from "./upsert-user-permission.use-case.ts";

function makeMockRepo(
	overrides: Partial<UserPermissionRepository> = {},
): UserPermissionRepository {
	return {
		findByUserResourceAction: vi.fn().mockResolvedValue(ok(null)),
		findByUserId: vi.fn(),
		save: vi.fn().mockResolvedValue(ok(undefined)),
		delete: vi.fn(),
		...overrides,
	};
}

describe("UpsertUserPermissionUseCase", () => {
	it("should create a user permission override", async () => {
		const mockRepo = makeMockRepo();
		const useCase = new UpsertUserPermissionUseCase(mockRepo);

		const result = await useCase.execute({
			userId: crypto.randomUUID(),
			resource: "product",
			action: "create",
			granted: true,
		});

		expect(result.isOk()).toBe(true);
		const entity = result._unsafeUnwrap();
		expect(entity.resource).toBe("product");
		expect(entity.action).toBe("create");
		expect(entity.granted).toBe(true);
		expect(mockRepo.save).toHaveBeenCalledOnce();
	});

	it("should propagate repository save error", async () => {
		const repoError = DomainError.infra("DB connection lost");
		const mockRepo = makeMockRepo({
			save: vi.fn().mockResolvedValue(err(repoError)),
		});
		const useCase = new UpsertUserPermissionUseCase(mockRepo);

		const result = await useCase.execute({
			userId: crypto.randomUUID(),
			resource: "product",
			action: "create",
			granted: true,
		});

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
	});

	it("updates an existing override without generating a new persisted identity", async () => {
		const createdAt = new Date("2026-03-20T10:00:00.000Z");
		const existing = UserPermissionEntity.reconstitute(
			UserPermissionId.create("perm-existing"),
			{
				userId: crypto.randomUUID(),
				resource: "product",
				action: "create",
				granted: false,
				createdAt,
			},
		);

		const mockRepo = makeMockRepo({
			findByUserResourceAction: vi.fn().mockResolvedValue(ok(existing)),
			save: vi.fn().mockResolvedValue(ok(undefined)),
		});

		const useCase = new UpsertUserPermissionUseCase(mockRepo);
		const result = await useCase.execute({
			userId: existing.userId,
			resource: existing.resource,
			action: existing.action,
			granted: true,
		});

		expect(result.isOk()).toBe(true);
		const entity = result._unsafeUnwrap();
		expect(entity.id).toBe(existing.id);
		expect(entity.createdAt).toBe(createdAt);
		expect(entity.granted).toBe(true);
		expect(mockRepo.findByUserResourceAction).toHaveBeenCalledOnce();
	});
});
