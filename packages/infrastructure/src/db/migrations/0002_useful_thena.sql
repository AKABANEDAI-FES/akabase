ALTER TABLE `projects` ADD `contest_vote_number` text;--> statement-breakpoint
CREATE UNIQUE INDEX `projects_event_vote_number_unique` ON `projects` (`event_id`,`contest_vote_number`);