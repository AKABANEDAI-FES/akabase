PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`place_id` text,
	`logo_image_id` text,
	`contest_vote_number` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`logo_image_id`) REFERENCES `images`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_projects`("id", "event_id", "org_id", "name", "place_id", "logo_image_id", "contest_vote_number", "created_at", "updated_at") SELECT "id", "event_id", "org_id", "name", "place_id", "logo_image_id", CASE WHEN "contest_vote_number" IS NOT NULL THEN printf('%04d', "contest_vote_number") ELSE NULL END, "created_at", "updated_at" FROM `projects`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `projects_event_id_idx` ON `projects` (`event_id`);--> statement-breakpoint
CREATE INDEX `projects_org_id_idx` ON `projects` (`org_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_event_vote_number_unique` ON `projects` (`event_id`,`contest_vote_number`);