import { container } from "@/container.ts";
import type { RequirePermissionGuardFactory } from "../authorization/presentation/authorization.guards.ts";
import { CreateProductUseCase } from "./application/use-cases/create-product.use-case.ts";
import { DeleteProductUseCase } from "./application/use-cases/delete-product.use-case.ts";
import { GetActiveProductUseCase } from "./application/use-cases/get-active-product.use-case.ts";
import { GetProductUseCase } from "./application/use-cases/get-product.use-case.ts";
import { ListActiveProductsUseCase } from "./application/use-cases/list-active-products.use-case.ts";
import { ListProductsUseCase } from "./application/use-cases/list-products.use-case.ts";
import { ToggleProductActiveUseCase } from "./application/use-cases/toggle-product-active.use-case.ts";
import { UpdateProductUseCase } from "./application/use-cases/update-product.use-case.ts";
import { DrizzleProductRepository } from "./infra/repositories/drizzle-product.repository.ts";
import { productRoutes } from "./presentation/product.routes.ts";
import { productFeedRoutes } from "./presentation/product-feed.routes.ts";

container.register("ProductRepository", {
	useClass: DrizzleProductRepository,
});

interface ProductModuleDeps {
	requirePermission: RequirePermissionGuardFactory;
}

export const createProductModule = (deps: ProductModuleDeps) => ({
	routes: productRoutes({
		createProduct: container.resolve(CreateProductUseCase),
		listProducts: container.resolve(ListProductsUseCase),
		getProduct: container.resolve(GetProductUseCase),
		updateProduct: container.resolve(UpdateProductUseCase),
		deleteProduct: container.resolve(DeleteProductUseCase),
		toggleProductActive: container.resolve(ToggleProductActiveUseCase),
		requirePermission: deps.requirePermission,
	}),
	feedRoutes: productFeedRoutes({
		listActiveProducts: container.resolve(ListActiveProductsUseCase),
		getActiveProduct: container.resolve(GetActiveProductUseCase),
	}),
});
