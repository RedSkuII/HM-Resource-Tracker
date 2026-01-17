-- Add Discord ID column to website_changes table for bot to link orders to users
ALTER TABLE website_changes ADD `changed_by_discord_id` text;
