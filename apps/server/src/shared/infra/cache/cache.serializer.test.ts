import { describe, expect, it } from "vitest";
import { deserializeResult, serializeResult } from "./cache.serializer.ts";

describe("Cache Serializer", () => {
	describe("serializeResult", () => {
		it("should serialize an object value", () => {
			const serialized = serializeResult({ id: "1", name: "Test" });
			const parsed = JSON.parse(serialized);

			expect(parsed).toEqual({ ok: true, value: { id: "1", name: "Test" } });
		});

		it("should serialize a null value", () => {
			const serialized = serializeResult(null);
			const parsed = JSON.parse(serialized);

			expect(parsed).toEqual({ ok: true, value: null });
		});

		it("should serialize an array value", () => {
			const serialized = serializeResult([{ id: "1" }, { id: "2" }]);
			const parsed = JSON.parse(serialized);

			expect(parsed).toEqual({ ok: true, value: [{ id: "1" }, { id: "2" }] });
		});
	});

	describe("deserializeResult", () => {
		it("should deserialize an object value", () => {
			const raw = JSON.stringify({
				ok: true,
				value: { id: "1", name: "Test" },
			});
			const result = deserializeResult(raw);

			expect(result).toEqual({ id: "1", name: "Test" });
		});

		it("should deserialize null value", () => {
			const raw = JSON.stringify({ ok: true, value: null });
			const result = deserializeResult(raw);

			expect(result).toBeNull();
		});

		it("should deserialize array value", () => {
			const raw = JSON.stringify({
				ok: true,
				value: [{ id: "1" }, { id: "2" }],
			});
			const result = deserializeResult(raw);

			expect(result).toEqual([{ id: "1" }, { id: "2" }]);
		});

		it("should rehydrate ISO date strings back to Date instances", () => {
			const raw = JSON.stringify({
				ok: true,
				value: {
					createdAt: "2026-03-19T17:34:45.000Z",
					nested: {
						updatedAt: "2026-03-19T17:35:45.000Z",
					},
				},
			});
			const result = deserializeResult<{
				createdAt: Date;
				nested: { updatedAt: Date };
			}>(raw);

			expect(result).not.toBeNull();
			// biome-ignore lint/style/noNonNullAssertion: We just want to assert the type here
			const value = result!;
			expect(value.createdAt).toBeInstanceOf(Date);
			expect(value.nested.updatedAt).toBeInstanceOf(Date);
			expect(value.createdAt.toISOString()).toBe("2026-03-19T17:34:45.000Z");
			expect(value.nested.updatedAt.toISOString()).toBe(
				"2026-03-19T17:35:45.000Z",
			);
		});

		it("returns null for invalid cache payloads", () => {
			expect(
				deserializeResult(JSON.stringify({ value: { id: "1" } })),
			).toBeNull();
		});
	});
});
