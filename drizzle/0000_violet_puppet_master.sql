CREATE TABLE `player_locations` (
	`room_id` text NOT NULL,
	`player_id` text NOT NULL,
	`data` text NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`room_id`, `player_id`),
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `location_expiry` ON `player_locations` (`expires_at`);--> statement-breakpoint
CREATE TABLE `room_members` (
	`room_id` text NOT NULL,
	`player_id` text NOT NULL,
	`joined_at` integer NOT NULL,
	`sharing` integer DEFAULT 0 NOT NULL,
	`seen_at` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`room_id`, `player_id`),
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`window_at` integer NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`host_id` text NOT NULL,
	`state` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`host_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_code_unique` ON `rooms` (`code`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`name` text NOT NULL,
	`expires_at` integer NOT NULL,
	`last_request` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`window_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);