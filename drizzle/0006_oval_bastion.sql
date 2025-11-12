CREATE TABLE `discord_embeds` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`message_id` text NOT NULL,
	`embed_type` text NOT NULL,
	`last_updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `discord_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`user_id` text NOT NULL,
	`username` text NOT NULL,
	`resource_id` text NOT NULL,
	`resource_name` text NOT NULL,
	`quantity` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`fulfilled_by` text,
	`fulfilled_at` integer,
	`created_at` integer NOT NULL,
	`notes` text,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `resource_discord_mapping` (
	`id` text PRIMARY KEY NOT NULL,
	`discord_item_name` text NOT NULL,
	`resource_id` text NOT NULL,
	`guild_id` text NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `website_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`change_type` text NOT NULL,
	`resource_id` text,
	`order_id` text,
	`previous_value` text,
	`new_value` text,
	`changed_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`processed_by_bot` integer DEFAULT false NOT NULL
);
