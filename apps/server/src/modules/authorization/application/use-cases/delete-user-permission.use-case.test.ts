import "reflect-metadata";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import type { UserPermissionRepository } from "../../domain/repositories/user-permission.repository.ts";
import { UserPermissionId } from "../../domain/value-objects/user-permission-id.vo.ts";
import { DeleteUserPermissionUseCase } from "./delete-user-permission.use-case.ts";

function makeMockRepo(
	overrides: Partial<UserPermissionRepository> = {},
): UserPermissionRepository {
	return {
		findByUserResourceAction: vi.fn(),
		findByUserId: vi.fn(),
		save: vi.fn(),
		delete: vi.fn().mockResolvedValue(ok(undefined)),
		...overrides,
	};
}

describe("DeleteUserPermissionUseCase", () => {
	it("should delete a permission override", async () => {
		const mockRepo = makeMockRepo();
		const useCase = new DeleteUserPermissionUseCase(mockRepo);

		const result = await useCase.execute(
			UserPermissionId.create(crypto.randomUUID()),
		);

		expect(result.isOk()).toBe(true);
		expect(mockRepo.delete).toHaveBeenCalledOnce();
	});

	it("should propagate repository error", async () => {
		const mockRepo = makeMockRepo({
			delete: vi.fn().mockResolvedValue(err(DomainError.infra("DB error"))),
		});
		const useCase = new DeleteUserPermissionUseCase(mockRepo);

		const result = await useCase.execute(
			UserPermissionId.create(crypto.randomUUID()),
		);

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
	});
});
