import type { PermissionPair } from "@nexa/auth/permissions";
import { err, ok, type Result } from "neverthrow";
import { Entity } from "@/shared/domain/entity.base.ts";
import {
	DomainError as DE,
	type DomainError,
} from "@/shared/domain/errors/index.ts";
import type { UserPermissionId } from "../value-objects/user-permission-id.vo.ts";

export type UserPermissionProps = PermissionPair & {
	userId: string;
	granted: boolean;
	createdAt: Date;
};

export class UserPermissionEntity extends Entity<
	UserPermissionId,
	UserPermissionProps
> {
	private constructor(id: UserPermissionId, props: UserPermissionProps) {
		super(id, props);
	}

	get userId(): string {
		return this.props.userId;
	}

	get resource(): UserPermissionProps["resource"] {
		return this.props.resource;
	}

	get action(): UserPermissionProps["action"] {
		return this.props.action;
	}

	get granted(): boolean {
		return this.props.granted;
	}

	get createdAt(): Date {
		return this.props.createdAt;
	}

	static create(
		params: { id: UserPermissionId } & UserPermissionProps,
	): Result<UserPermissionEntity, DomainError> {
		if (params.resource.length === 0) {
			return err(
				DE.validation("Permission resource cannot be empty", "resource"),
			);
		}

		if (params.action.length === 0) {
			return err(DE.validation("Permission action cannot be empty", "action"));
		}

		return ok(
			new UserPermissionEntity(params.id, {
				userId: params.userId,
				resource: params.resource,
				action: params.action,
				granted: params.granted,
				createdAt: params.createdAt,
			}),
		);
	}

	static reconstitute(
		id: UserPermissionId,
		props: UserPermissionProps,
	): UserPermissionEntity {
		return new UserPermissionEntity(id, props);
	}

	setGranted(granted: boolean): void {
		this.props.granted = granted;
	}
}
