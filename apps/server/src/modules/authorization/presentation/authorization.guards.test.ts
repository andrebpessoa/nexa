import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import { createAuthorizationGuards } from "./authorization.guards.ts";

function getStatusCode(response: unknown): number | undefined {
	if (response instanceof Response) {
		return response.status;
	}

	if (
		response &&
		typeof response === "object" &&
		"code" in response &&
		typeof response.code === "number"
	) {
		return response.code;
	}

	return undefined;
}

describe("createAuthorizationGuards", () => {
	it("returns 401 when no session exists", async () => {
		const guards = createAuthorizationGuards({
			getSession: vi.fn().mockResolvedValue(null),
			checkUserPermission: {
				execute: vi.fn(),
			},
		});

		const response = await guards.requirePermission(
			"product",
			"read",
		)({
			request: new Request("http://localhost/api/products"),
		});

		expect(getStatusCode(response)).toBe(401);
	});

	it("returns 403 when the permission use case denies access", async () => {
		const guards = createAuthorizationGuards({
			getSession: vi.fn().mockResolvedValue({
				user: { id: crypto.randomUUID(), role: "member" },
			}),
			checkUserPermission: {
				execute: vi.fn().mockResolvedValue(ok(false)),
			},
		});

		const response = await guards.requirePermission(
			"product",
			"delete",
		)({
			request: new Request("http://localhost/api/products/1"),
		});

		expect(getStatusCode(response)).toBe(403);
	});

	it("returns 500-shaped domain error when permission resolution fails", async () => {
		const guards = createAuthorizationGuards({
			getSession: vi.fn().mockResolvedValue({
				user: { id: crypto.randomUUID(), role: "member" },
			}),
			checkUserPermission: {
				execute: vi.fn().mockResolvedValue(err(DomainError.infra("DB down"))),
			},
		});

		const response = await guards.requirePermission(
			"product",
			"read",
		)({
			request: new Request("http://localhost/api/products"),
		});

		expect(getStatusCode(response)).toBe(500);
	});

	it("lets the request through when permission is granted", async () => {
		const guards = createAuthorizationGuards({
			getSession: vi.fn().mockResolvedValue({
				user: { id: crypto.randomUUID(), role: "member" },
			}),
			checkUserPermission: {
				execute: vi.fn().mockResolvedValue(ok(true)),
			},
		});

		const response = await guards.requirePermission(
			"product",
			"read",
		)({
			request: new Request("http://localhost/api/products"),
		});

		expect(response).toBeUndefined();
	});

	it("lets admins pass through the admin guard", async () => {
		const guards = createAuthorizationGuards({
			getSession: vi.fn().mockResolvedValue({
				user: { id: crypto.randomUUID(), role: "admin" },
			}),
			checkUserPermission: {
				execute: vi.fn(),
			},
		});

		const response = await guards.requireAdmin()({
			request: new Request("http://localhost/api/admin/permissions"),
		});

		expect(response).toBeUndefined();
	});

	it("returns 403 for non-admin users on admin guard", async () => {
		const guards = createAuthorizationGuards({
			getSession: vi.fn().mockResolvedValue({
				user: { id: crypto.randomUUID(), role: "member" },
			}),
			checkUserPermission: {
				execute: vi.fn(),
			},
		});

		const response = await guards.requireAdmin()({
			request: new Request("http://localhost/api/admin/permissions"),
		});

		expect(getStatusCode(response)).toBe(403);
	});
});
