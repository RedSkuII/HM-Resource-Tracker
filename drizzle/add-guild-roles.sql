-- Migration: Add officer and leader role ID columns to guilds table
-- Date: 2025-12-08

ALTER TABLE guilds ADD COLUMN discord_officer_role_id TEXT;
ALTER TABLE guilds ADD COLUMN discord_leader_role_id TEXT;
