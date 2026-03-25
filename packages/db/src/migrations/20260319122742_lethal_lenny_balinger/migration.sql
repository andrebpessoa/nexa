CREATE TABLE `user_permission` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`resource` varchar(64) NOT NULL,
	`action` varchar(64) NOT NULL,
	`granted` boolean NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `user_permission_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_permission_unique_idx` UNIQUE(`user_id`,`resource`,`action`)
);
--> statement-breakpoint
ALTER TABLE `session` ADD `impersonated_by` varchar(36);--> statement-breakpoint
ALTER TABLE `user` ADD `role` varchar(255);--> statement-breakpoint
ALTER TABLE `user` ADD `banned` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `user` ADD `ban_reason` text;--> statement-breakpoint
ALTER TABLE `user` ADD `ban_expires` timestamp(3);--> statement-breakpoint
ALTER TABLE `user_permission` ADD CONSTRAINT `user_permission_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;