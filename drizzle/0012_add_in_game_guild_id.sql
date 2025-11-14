-- Add in_game_guild_id column to bot_configurations table
ALTER TABLE bot_configurations ADD COLUMN in_game_guild_id TEXT;
