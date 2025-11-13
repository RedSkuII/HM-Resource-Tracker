CREATE TABLE `bot_activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`event_type` text NOT NULL,
	`user_id` text,
	`username` text,
	`resource_id` text,
	`resource_name` text,
	`quantity` integer,
	`points_awarded` real,
	`details` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bot_configurations` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`guild_name` text,
	`bot_channel_id` text,
	`order_channel_id` text,
	`admin_role_id` text,
	`auto_update_embeds` integer DEFAULT true NOT NULL,
	`notify_on_website_changes` integer DEFAULT true NOT NULL,
	`order_fulfillment_bonus` integer DEFAULT 50 NOT NULL,
	`allow_public_orders` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bot_configurations_guild_id_unique` ON `bot_configurations` (`guild_id`);