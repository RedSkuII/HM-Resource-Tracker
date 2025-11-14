import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// Create client - handles both local SQLite and Turso
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
})

// Database schema
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  discordId: text('discord_id').unique().notNull(),
  username: text('username').notNull(),
  avatar: text('avatar'),
  customNickname: text('custom_nickname'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastLogin: integer('last_login', { mode: 'timestamp' }).notNull(),
})

export const userSessions = sqliteTable('user_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  roles: text('roles').notNull(), // JSON string of roles array
  isInGuild: integer('is_in_guild', { mode: 'boolean' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// In-game guilds table
export const guilds = sqliteTable('guilds', {
  id: text('id').primaryKey(), // Slug version of title (e.g., 'house-melange')
  discordGuildId: text('discord_guild_id').notNull(), // Discord server ID
  title: text('title').notNull(), // Display name (e.g., 'House Melange')
  maxMembers: integer('max_members').notNull().default(32),
  leaderId: text('leader_id'), // Discord user ID of guild leader
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const resources = sqliteTable('resources', {
  id: text('id').primaryKey(),
  guildId: text('guild_id'), // In-game guild ID (e.g., 'house-melange', 'whitelist-second-guild')
  name: text('name').notNull(),
  quantity: integer('quantity').notNull().default(0),
  description: text('description'),
  category: text('category'),
  icon: text('icon'), // Emoji or icon identifier like '🪵', '🪨', or ':CustomEmoji:'
  imageUrl: text('image_url'), // URL to resource image
  status: text('status'), // 'at_target', 'below_target', 'critical'
  targetQuantity: integer('target_quantity'), // Target/threshold quantity for status calculation
  multiplier: real('multiplier').notNull().default(1.0), // Points multiplier for this resource
  lastUpdatedBy: text('last_updated_by').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const resourceHistory = sqliteTable('resource_history', {
  id: text('id').primaryKey(),
  resourceId: text('resource_id').notNull().references(() => resources.id),
  guildId: text('guild_id'), // In-game guild ID
  previousQuantity: integer('previous_quantity').notNull(),
  newQuantity: integer('new_quantity').notNull(),
  changeAmount: integer('change_amount').notNull(), // +/- amount
  changeType: text('change_type').notNull(), // 'absolute' or 'relative'
  updatedBy: text('updated_by').notNull(),
  reason: text('reason'), // Optional reason for the change
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const leaderboard = sqliteTable('leaderboard', {
  id: text('id').primaryKey(),
  guildId: text('guild_id'), // In-game guild ID
  userId: text('user_id').notNull(),
  resourceId: text('resource_id').notNull().references(() => resources.id),
  actionType: text('action_type').notNull(), // 'ADD', 'SET', 'REMOVE'
  quantityChanged: integer('quantity_changed').notNull(),
  basePoints: real('base_points').notNull(), // Points before multipliers
  resourceMultiplier: real('resource_multiplier').notNull(),
  statusBonus: real('status_bonus').notNull(), // Percentage bonus (0.0, 0.05, 0.10)
  finalPoints: real('final_points').notNull(), // Final calculated points
  resourceName: text('resource_name').notNull(),
  resourceCategory: text('resource_category').notNull(),
  resourceStatus: text('resource_status').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// Discord integration tables
export const discordOrders = sqliteTable('discord_orders', {
  id: text('id').primaryKey(),
  guildId: text('guild_id').notNull(),
  channelId: text('channel_id').notNull(),
  userId: text('user_id').notNull(), // Discord user ID
  username: text('username').notNull(),
  resourceId: text('resource_id').notNull().references(() => resources.id),
  resourceName: text('resource_name').notNull(),
  quantity: integer('quantity').notNull(),
  status: text('status').notNull().default('pending'), // 'pending', 'fulfilled', 'cancelled'
  fulfilledBy: text('fulfilled_by'),
  fulfilledAt: integer('fulfilled_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  notes: text('notes'),
})

export const resourceDiscordMapping = sqliteTable('resource_discord_mapping', {
  id: text('id').primaryKey(),
  discordItemName: text('discord_item_name').notNull(),
  resourceId: text('resource_id').notNull().references(() => resources.id),
  guildId: text('guild_id').notNull(),
})

export const discordEmbeds = sqliteTable('discord_embeds', {
  id: text('id').primaryKey(),
  guildId: text('guild_id').notNull(),
  channelId: text('channel_id').notNull(),
  messageId: text('message_id').notNull(),
  embedType: text('embed_type').notNull(), // 'stock', 'leaderboard', 'orders'
  lastUpdated: integer('last_updated', { mode: 'timestamp' }).notNull(),
})

export const websiteChanges = sqliteTable('website_changes', {
  id: text('id').primaryKey(),
  changeType: text('change_type').notNull(), // 'resource_update', 'order_fulfilled', 'order_cancelled'
  resourceId: text('resource_id'),
  orderId: text('order_id'),
  previousValue: text('previous_value'),
  newValue: text('new_value'),
  changedBy: text('changed_by').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  processedByBot: integer('processed_by_bot', { mode: 'boolean' }).notNull().default(false),
})

// Bot dashboard configuration
export const botConfigurations = sqliteTable('bot_configurations', {
  id: text('id').primaryKey(),
  guildId: text('guild_id').notNull().unique(),
  guildName: text('guild_name'),
  botChannelId: text('bot_channel_id'), // Channel where bot posts notifications
  orderChannelId: text('order_channel_id'), // Channel where orders are created
  adminRoleId: text('admin_role_id'), // Role that can access bot dashboard
  autoUpdateEmbeds: integer('auto_update_embeds', { mode: 'boolean' }).notNull().default(true),
  notifyOnWebsiteChanges: integer('notify_on_website_changes', { mode: 'boolean' }).notNull().default(true),
  orderFulfillmentBonus: integer('order_fulfillment_bonus').notNull().default(50), // Bonus % for Discord order fills (50% = 1.5x)
  websiteBonusPercentage: integer('website_bonus_percentage').notNull().default(0), // Bonus % for website additions (0% = no bonus)
  allowPublicOrders: integer('allow_public_orders', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// Bot activity logging for dashboard
export const botActivityLogs = sqliteTable('bot_activity_logs', {
  id: text('id').primaryKey(),
  guildId: text('guild_id').notNull(),
  eventType: text('event_type').notNull(), // 'order_created', 'order_filled', 'order_cancelled', 'stock_updated', 'embed_updated', 'config_changed'
  userId: text('user_id'), // Discord user ID who triggered the action
  username: text('username'),
  resourceId: text('resource_id'),
  resourceName: text('resource_name'),
  quantity: integer('quantity'),
  pointsAwarded: real('points_awarded'),
  details: text('details'), // JSON string for additional context
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const db = drizzle(client, { 
  schema: { 
    users, 
    userSessions,
    guilds,
    resources, 
    resourceHistory, 
    leaderboard,
    discordOrders,
    resourceDiscordMapping,
    discordEmbeds,
    websiteChanges,
    botConfigurations,
    botActivityLogs
  } 
}) 