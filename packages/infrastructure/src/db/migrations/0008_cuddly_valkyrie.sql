CREATE TABLE `project_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_categories_event_id_idx` ON `project_categories` (`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_categories_event_name_unique` ON `project_categories` (`event_id`,`name`);--> statement-breakpoint
ALTER TABLE `projects` ADD `category_id` text REFERENCES project_categories(id);--> statement-breakpoint
CREATE INDEX `projects_category_id_idx` ON `projects` (`category_id`);