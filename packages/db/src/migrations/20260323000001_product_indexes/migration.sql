CREATE INDEX `product_deleted_at_idx` ON `product`(`deleted_at`);
--> statement-breakpoint
CREATE INDEX `product_active_deleted_idx` ON `product`(`active`, `deleted_at`);
