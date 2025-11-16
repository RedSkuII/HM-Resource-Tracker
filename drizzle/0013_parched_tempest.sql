ALTER TABLE guilds ADD `guild_officer_roles` text;--> statement-breakpoint
ALTER TABLE guilds ADD `default_role_id` text;--> statement-breakpoint
ALTER TABLE guilds ADD `bot_channel_id` text;--> statement-breakpoint
ALTER TABLE guilds ADD `order_channel_id` text;--> statement-breakpoint
ALTER TABLE guilds ADD `admin_role_id` text;--> statement-breakpoint
ALTER TABLE guilds ADD `auto_update_embeds` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE guilds ADD `notify_on_website_changes` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE guilds ADD `order_fulfillment_bonus` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE guilds ADD `website_bonus_percentage` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE guilds ADD `allow_public_orders` integer DEFAULT true NOT NULL;