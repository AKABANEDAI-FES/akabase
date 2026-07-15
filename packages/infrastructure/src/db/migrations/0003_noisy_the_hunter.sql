ALTER TABLE `project_drafts` ADD `opening_hours` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `project_drafts` ADD `last_entry_time` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `project_published` ADD `opening_hours` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `project_published` ADD `last_entry_time` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `project_submissions` ADD `opening_hours` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `project_submissions` ADD `last_entry_time` text DEFAULT '' NOT NULL;