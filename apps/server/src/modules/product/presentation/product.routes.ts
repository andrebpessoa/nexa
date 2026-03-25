import { Elysia } from "elysia";
import * as z from "zod";
import { toErrorResponse, toHttpStatus } from "@/shared/domain/errors/index.ts";
import { jsonResponse } from "@/shared/presentation/helpers/json-response.ts";
import { errorResponseSchema } from "@/shared/presentation/schemas/error-response.schema.ts";
import {
	paginatedResponseSchema,
	paginationQuerySchema,
} from "@/shared/presentation/schemas/pagination.schema.ts";
import type { RequirePermissionGuardFactory } from "../../authorization/presentation/authorization.guards.ts";
import { createProductDto } from "../application/dtos/create-product.dto.ts";
import { toggleProductActiveDto } from "../application/dtos/toggle-product-active.dto.ts";
import { updateProductDto } from "../application/dtos/update-product.dto.ts";
import type { CreateProductUseCase } from "../application/use-cases/create-product.use-case.ts";
import type { DeleteProductUseCase } from "../application/use-cases/delete-product.use-case.ts";
import type { GetProductUseCase } from "../application/use-cases/get-product.use-case.ts";
import type { ListProductsUseCase } from "../application/use-cases/list-products.use-case.ts";
import type { ToggleProductActiveUseCase } from "../application/use-cases/toggle-product-active.use-case.ts";
import type { UpdateProductUseCase } from "../application/use-cases/update-product.use-case.ts";
import { ProductId } from "../domain/value-objects/product-id.vo.ts";
import { ProductResponseMapper } from "./mappers/product-response.mapper.ts";
import { productResponseSchema } from "./schemas/product-response.schema.ts";

interface ProductRouteDeps {
	createProduct: CreateProductUseCase;
	listProducts: ListProductsUseCase;
	getProduct: GetProductUseCase;
	updateProduct: UpdateProductUseCase;
	deleteProduct: DeleteProductUseCase;
	toggleProductActive: ToggleProductActiveUseCase;
	requirePermission: RequirePermissionGuardFactory;
}

const paginatedProductResponseSchema = paginatedResponseSchema(
	productResponseSchema,
);

export const productRoutes = (deps: ProductRouteDeps) =>
	new Elysia({ prefix: "/api/products" })
		.get(
			"/",
			async ({ query }) => {
				const limit = query.limit ?? 50;
				const offset = query.offset ?? 0;
				const result = await deps.listProducts.execute({ limit, offset });

				return result.match(
					(data) =>
						jsonResponse({
							items: data.items.map(ProductResponseMapper.toResponse),
							total: data.total,
							limit: data.limit,
							offset: data.offset,
						}),
					(error) => jsonResponse(toErrorResponse(error), toHttpStatus(error)),
				);
			},
			{
				beforeHandle: [deps.requirePermission("product", "read")],
				detail: { tags: ["products"], summary: "List all products" },
				query: paginationQuerySchema,
				response: {
					200: paginatedProductResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					500: errorResponseSchema,
				},
			},
		)
		.get(
			"/:id",
			async ({ params }) => {
				const result = await deps.getProduct.execute(
					ProductId.create(params.id),
				);

				return result.match(
					(product) => jsonResponse(ProductResponseMapper.toResponse(product)),
					(error) => jsonResponse(toErrorResponse(error), toHttpStatus(error)),
				);
			},
			{
				beforeHandle: [deps.requirePermission("product", "read")],
				detail: { tags: ["products"], summary: "Get product by ID" },
				response: {
					200: productResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					404: errorResponseSchema,
					500: errorResponseSchema,
				},
			},
		)
		.post(
			"/",
			async ({ body }) => {
				const result = await deps.createProduct.execute(body);

				return result.match(
					(product) =>
						jsonResponse(ProductResponseMapper.toResponse(product), 201),
					(error) => jsonResponse(toErrorResponse(error), toHttpStatus(error)),
				);
			},
			{
				beforeHandle: [deps.requirePermission("product", "create")],
				detail: { tags: ["products"], summary: "Create a new product" },
				body: createProductDto,
				response: {
					201: productResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					409: errorResponseSchema,
					422: errorResponseSchema,
					500: errorResponseSchema,
				},
			},
		)
		.put(
			"/:id",
			async ({ params, body }) => {
				const result = await deps.updateProduct.execute({
					id: ProductId.create(params.id),
					dto: body,
				});

				return result.match(
					(product) => jsonResponse(ProductResponseMapper.toResponse(product)),
					(error) => jsonResponse(toErrorResponse(error), toHttpStatus(error)),
				);
			},
			{
				beforeHandle: [deps.requirePermission("product", "update")],
				detail: { tags: ["products"], summary: "Update product by ID" },
				body: updateProductDto,
				response: {
					200: productResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					404: errorResponseSchema,
					422: errorResponseSchema,
					500: errorResponseSchema,
				},
			},
		)
		.patch(
			"/:id/active",
			async ({ params, body }) => {
				const result = await deps.toggleProductActive.execute({
					id: ProductId.create(params.id),
					dto: body,
				});

				return result.match(
					(product) => jsonResponse(ProductResponseMapper.toResponse(product)),
					(error) => jsonResponse(toErrorResponse(error), toHttpStatus(error)),
				);
			},
			{
				beforeHandle: [deps.requirePermission("product", "update")],
				detail: {
					tags: ["products"],
					summary: "Toggle product active state by ID",
				},
				body: toggleProductActiveDto,
				response: {
					200: productResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					404: errorResponseSchema,
					422: errorResponseSchema,
					500: errorResponseSchema,
				},
			},
		)
		.delete(
			"/:id",
			async ({ params }) => {
				const result = await deps.deleteProduct.execute(
					ProductId.create(params.id),
				);

				return result.match(
					() => jsonResponse({ success: true }),
					(error) => jsonResponse(toErrorResponse(error), toHttpStatus(error)),
				);
			},
			{
				beforeHandle: [deps.requirePermission("product", "delete")],
				detail: { tags: ["products"], summary: "Soft delete product by ID" },
				response: {
					200: z.object({ success: z.boolean() }),
					401: errorResponseSchema,
					403: errorResponseSchema,
					404: errorResponseSchema,
					500: errorResponseSchema,
				},
			},
		);
