import { Elysia } from "elysia";
import { toErrorResponse, toHttpStatus } from "@/shared/domain/errors/index.ts";
import { jsonResponse } from "@/shared/presentation/helpers/json-response.ts";
import { errorResponseSchema } from "@/shared/presentation/schemas/error-response.schema.ts";
import {
	paginatedResponseSchema,
	paginationQuerySchema,
} from "@/shared/presentation/schemas/pagination.schema.ts";
import type { GetActiveProductUseCase } from "../application/use-cases/get-active-product.use-case.ts";
import type { ListActiveProductsUseCase } from "../application/use-cases/list-active-products.use-case.ts";
import { ProductId } from "../domain/value-objects/product-id.vo.ts";
import { ProductResponseMapper } from "./mappers/product-response.mapper.ts";
import { productResponseSchema } from "./schemas/product-response.schema.ts";

interface ProductFeedRouteDeps {
	listActiveProducts: ListActiveProductsUseCase;
	getActiveProduct: GetActiveProductUseCase;
}

const paginatedProductFeedResponseSchema = paginatedResponseSchema(
	productResponseSchema,
);

export const productFeedRoutes = (deps: ProductFeedRouteDeps) =>
	new Elysia({ prefix: "/api/products/feed" })
		.get(
			"/",
			async ({ query }) => {
				const limit = query.limit ?? 50;
				const offset = query.offset ?? 0;
				const result = await deps.listActiveProducts.execute({ limit, offset });

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
				detail: { tags: ["products"], summary: "List all active products" },
				query: paginationQuerySchema,
				response: {
					200: paginatedProductFeedResponseSchema,
					404: errorResponseSchema,
				},
			},
		)
		.get(
			"/:id",
			async ({ params }) => {
				const result = await deps.getActiveProduct.execute(
					ProductId.create(params.id),
				);

				return result.match(
					(product) => jsonResponse(ProductResponseMapper.toResponse(product)),
					(error) => jsonResponse(toErrorResponse(error), toHttpStatus(error)),
				);
			},
			{
				detail: { tags: ["products"], summary: "Get active product by ID" },
				response: {
					200: productResponseSchema,
					404: errorResponseSchema,
				},
			},
		);
