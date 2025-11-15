# Resource Tracker

A comprehensive resource management and tracking portal with Discord authentication and role-based access control. Perfect for gaming communities, organizations, and teams that need to track shared resources, inventory, or assets.

Originally designed for Dune Awakening guilds, but can be adapted to track any type of resources. Supports **multiple Discord servers**, each tracking their own in-game guild with a 1:1 relationship between Discord servers and in-game guilds.

Built for [https://www.silverorder.org](https://www.silverorder.org) - if you find any references to it, feel free to submit a PR to fix them.

This project is open to the community - if you can build it and it works, pull requests are welcome! 🙏

If you like what I did, feel free to 

[![Buy Me A Coffee](https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=☕&slug=yetty&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff)](https://www.buymeacoffee.com/yetty)

![alt text](image.png)

## � Table of Contents

- [Quick Start](#-quick-start)
- [Features](#features)
- [Free Deployment Guide](#-deploy-for-free-recommended)
- [Discord Bot Configuration](#-discord-bot-configuration-guide)
- [Local Development](#️-local-development-setup)
- [Customization](#customization)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture-highlights)
- [Contributing](#contributing)
- [License](#license)

## �🚀 Quick Start

**5-Minute Setup:**
1. ⭐ Fork this repository
2. 🔐 Create Discord OAuth app ([guide](#step-2-set-up-discord-oauth-application))
3. 💾 Create free Turso database ([guide](#step-4-create-free-turso-database))
4. 🚀 Deploy to Vercel with environment variables
5. 📊 Run database migrations
6. 🎮 Configure your Discord server in Bot Dashboard
7. ✅ Start tracking resources!

**What You Get:**
- ✅ Web portal for resource tracking
- ✅ Discord authentication & role-based permissions
- ✅ Points system & leaderboards
- ✅ Multi-server & multi-guild support
- ✅ Bot configuration dashboard
- ✅ GDPR-compliant data management
- ✅ 100% free hosting (Vercel + Turso)

## Features

### Core Features
- **Discord OAuth Authentication** - Secure login with Discord
- **Multi-Server Support** - Configure different settings for each Discord server you manage
- **Guild Tracking** - Each Discord server tracks ONE in-game guild (1:1 relationship)
- **Role-Based Access Control** - Permissions managed through Discord server roles
- **Resource Management** - Track quantities, categories, and changes with visual status indicators
- **Paginated Views** - Efficient loading of large resource lists (25 items per page)
- **Activity Logging** - Complete audit trail of all user actions with time filtering
- **Points & Leaderboard** - Gamified contribution tracking with customizable point bonuses

### Discord Bot Integration
- **Bot Configuration Dashboard** - Easy setup for Discord bot features
- **Auto-Presence Detection** - Automatically detects if bot is in your server
- **Channel Configuration** - Set bot notification channels and order channels
- **Role Permissions** - Configure admin roles for dashboard access
- **Bonus Settings** - Customize Discord order fulfillment bonuses (0-200%)
- **Website Bonuses** - Reward users for adding resources via website (0-200%)
- **Toggle Features** - Auto-update embeds, website change notifications, public orders

### Data & Privacy
- **GDPR Compliance** - Data export and deletion tools for privacy compliance
- **Grid & Table Views** - Multiple ways to view and manage resources
- **Real-Time Updates** - Live status changes and animations
- **Interactive Charts** - Resource history visualization with hover details
- **Admin Controls** - Target quantity management for authorized roles
- **Responsive Design** - Modern UI optimized for all devices

## GDPR & Privacy Features

- **Data Export** - Users can download all their data in JSON format
- **Data Deletion** - Request anonymization of personal data
- **Activity Transparency** - View complete history of actions taken
- **Privacy Controls** - Clear data retention policies and user rights

## 🆓 Deploy for Free (Recommended)

### Step 1: Fork the Repository
1. Click the "Fork" button at the top of this GitHub repository
2. Clone your fork to your local machine:
```bash
git clone https://github.com/YOUR_USERNAME/ResourceTracker.git
cd ResourceTracker
```

### Step 2: Set up Discord OAuth Application
1. Go to https://discord.com/developers/applications
2. Click "New Application" and give it a name
3. Go to **OAuth2 → General**:
   - Copy the **Client ID** and **Client Secret** (save these for later)
   - In **Scopes**, ensure you have: `identify`, `guilds`, `guilds.members.read`
4. Go to **OAuth2 → Redirects**:
   - Add redirect URI: `https://your-app-name.vercel.app/api/auth/callback/discord`
   - Replace `your-app-name` with your planned Vercel app name
5. Go to **Bot** (optional, for Discord bot integration):
   - Click "Add Bot" if you want Discord bot features (order management, notifications)
   - Copy the bot token for later (if using bot features)
   - Under "Privileged Gateway Intents", enable "Server Members Intent"

### Step 3: Get Discord Configuration Details
1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. **For single-server setup**:
   - Right-click your Discord server → "Copy Server ID" (this is your `DISCORD_GUILD_ID`)
   - Right-click on roles you want to use → "Copy ID" (for `DISCORD_ROLES_CONFIG`)
3. **For multi-server setup** (recommended):
   - Skip `DISCORD_GUILD_ID` - the app will auto-detect servers you manage
   - Each Discord server admin configures their own settings via the Bot Dashboard
   - Link in-game guilds to Discord servers in the Guilds section

### Step 4: Create Free Turso Database
1. Go to https://turso.tech and sign up (free tier: 500 databases, 1B row reads/month)
2. Click "Create Database"
3. Choose a database name (e.g., `resource-tracker-db`)
4. Select the closest region to your users
5. After creation, click on your database
6. Copy the **Database URL** (starts with `libsql://`)
7. Click "Create Token" and copy the **Auth Token**

### Step 5: Deploy to Vercel
1. Go to https://vercel.com and sign up with your GitHub account
2. Click "New Project" and import your forked repository
3. In the deployment settings, add these **Environment Variables**:

```bash
# Discord OAuth (from Step 2)
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# Optional: For single-server mode only (leave blank for multi-server)
DISCORD_GUILD_ID=your_discord_server_id

# Discord Roles (single line JSON - see ENVIRONMENT.md for details)
DISCORD_ROLES_CONFIG=[{"id":"your_role_id","name":"Admin","level":100,"isAdmin":true,"canAccessResources":true}]

# Optional: For Discord bot features (order management, notifications)
DISCORD_BOT_TOKEN=your_bot_token_from_discord_developer_portal

# NextAuth (generate with: openssl rand -base64 32)
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your_long_random_secret_here

# Turso Database (from Step 4)
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token

# Optional: Customize branding
NEXT_PUBLIC_ORG_NAME=Your Community Name
```

4. Click **Deploy**

### Step 6: Initialize Database Schema
After deployment, you need to set up your database tables:

1. Install Drizzle CLI locally:
```bash
npm install -g drizzle-kit
```

2. Clone your repository and install dependencies:
```bash
git clone https://github.com/YOUR_USERNAME/ResourceTracker.git
cd ResourceTracker
npm install
```

3. Create a `.env.local` file with your Turso credentials:
```bash
TURSO_DATABASE_URL=your_turso_database_url
TURSO_AUTH_TOKEN=your_turso_auth_token
```

4. Run the database migration:
```bash
npm run db:push
```

### Step 7: Populate with Sample Data (Optional)
Add some initial resources to test the app:

```bash
npm run populate-resources-safe
```

### Step 8: Update Discord OAuth Redirect
Go back to your Discord application and update the redirect URI to match your deployed Vercel URL:
- `https://your-actual-vercel-url.vercel.app/api/auth/callback/discord`

### 🎉 You're Done!
Your Resource Tracker is now running for free! Visit your Vercel URL and sign in with Discord.

**Initial Setup After Deployment:**
1. Sign in with your Discord account
2. Go to **Bot Dashboard** to configure your Discord server(s)
3. Select your Discord server from the dropdown (only shows servers you own/admin)
4. If the bot isn't in your server, click "Add Bot to Server"
5. Configure bot channels, roles, and bonus settings
6. Go to **Resources** page and select your in-game guild to start tracking

**Multi-Server Configuration:**
- Each Discord server owner/admin can independently configure their bot settings
- Each Discord server links to ONE in-game guild (1:1 relationship)
- Each in-game guild can only be linked to ONE Discord server
- This ensures clear ownership and prevents configuration conflicts
- Resources are tracked separately per in-game guild
- Leaderboards and activity logs are guild-specific

**Guild Dropdown Behavior:**
- The system automatically retries if guilds don't load immediately
- If you see "No Guilds Available", wait 1-2 seconds for the retry
- This is normal during session authentication - guilds will appear automatically
- No manual refresh needed - the system handles this for you

**Free Tier Limits:**
- **Vercel**: 100GB bandwidth, unlimited projects
- **Turso**: 500 databases, 1B row reads, 1M row writes/month
- **Discord**: Unlimited OAuth usage

---

## 🛠️ Local Development Setup

For local development:

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file with the environment variables (see [ENVIRONMENT.md](./ENVIRONMENT.md) for details)

3. Run database migrations:
```bash
npm run db:push
```

4. Start the development server:
```bash
npm run dev
```

## Customization

This application is designed to be easily customizable for any organization or community:

- **Branding**: Set `NEXT_PUBLIC_ORG_NAME` to customize organization name
- **Roles**: Configure Discord roles via `DISCORD_ROLES_CONFIG` 
- **Resources**: Modify resource categories and types to fit your needs
- **Styling**: Update themes and colors in Tailwind configuration

See [ENVIRONMENT.md](./ENVIRONMENT.md) for all configuration options.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Authentication**: NextAuth.js with Discord OAuth (scopes: identify, guilds, guilds.members.read)
- **Database**: Turso (libSQL/SQLite), Drizzle ORM
- **Deployment**: Vercel-ready (Edge Runtime compatible)
- **Privacy**: GDPR-compliant data handling with export/deletion features
- **Bot Integration**: Discord.js compatible for bot features (optional)

## Architecture Highlights

- **Multi-Tenant**: Supports multiple Discord servers with separate configurations
- **Guild Mapping**: Link in-game guilds (Houses, Clans) to Discord servers via `discordGuildId`
- **Pagination**: Efficient 25-item pages with SQL COUNT for accurate totals
- **Points System**: Configurable bonuses for Discord vs website contributions (0-200%)
- **Bot Presence Detection**: Automatically detects if bot is installed before showing config
- **Session Caching**: 4-hour JWT tokens with Discord role caching for performance

## 🤖 Discord Bot Configuration Guide

### Bot Dashboard Features

The Bot Dashboard (`/dashboard/bot`) provides a complete interface for configuring Discord bot integration:

#### 1. **Server Selection**
- **Discord Server Dropdown**: Select which Discord server to configure
  - Automatically sorted: Servers with bot installed first (✅), then servers without bot (⚠️)
  - Owner servers marked with 👑
  - Shows real-time bot presence status
  - Only displays servers where you have Administrator permissions or ownership

- **In-Game Guild Dropdown**: Select which in-game guild (House, Clan) to track
  - Filtered by selected Discord server
  - Links resources to specific Discord communities
  - Each Discord server can track a different in-game guild

#### 2. **Channel Configuration** (Multi-Select)

**Bot Channels** - Where the bot posts notifications
- Select multiple channels (hold Ctrl/Cmd)
- Examples: #announcements, #bot-logs, #resource-tracker
- Used for: Website change notifications, general bot messages
- Visual tags show selected channels with quick removal (×)

**Order Channels** - Where resource orders are created
- Select multiple channels for order management
- Examples: #orders, #requests, #marketplace
- Used for: Public order system, fulfillment tracking
- Supports Discord slash commands for creating/filling orders

#### 3. **Role Configuration** (Multi-Select)

**Admin Roles** - Roles that can access the bot dashboard
- Select multiple roles (hold Ctrl/Cmd)
- Examples: @Admin, @Moderator, @Officers
- Grants access to: Configuration changes, statistics, activity logs
- Separate from resource permissions (controlled via `DISCORD_ROLES_CONFIG`)

#### 4. **Points & Bonus System**

**Discord Order Fulfillment Bonus: 0-200%**
- Default: 50% (1.5x points)
- Controls point multiplier for filling orders via Discord bot
- Examples:
  - 0% = No bonus (1.0x base points)
  - 50% = 1.5x points (recommended)
  - 100% = 2.0x points (double points)
  - 200% = 3.0x points (triple points)
- Encourages Discord-based resource distribution

**Website Addition Bonus: 0-200%**
- Default: 0% (no bonus)
- Controls point multiplier for adding resources via website
- Same scaling as Discord bonus
- Use cases:
  - Set higher to encourage website usage
  - Set lower to prioritize Discord activity
  - Match Discord bonus for equal rewards

#### 5. **Bot Behavior Toggles**

**✅ Auto-update embeds**
- **Enabled**: Bot edits existing embed messages when data changes
- **Disabled**: Creates new messages for each update (historical record)
- Use case: Keep pinned stock messages synchronized in real-time
- Prevents: Channel spam from repeated new messages

**✅ Notify on website changes**
- **Enabled**: Bot posts notifications when resources are added/removed via website
- **Disabled**: Only Discord-based changes trigger notifications
- Use case: Keep Discord community informed of website activity
- Example: "🔔 @Username added 1000x Iron Ore (+10 points)"

**✅ Allow public orders**
- **Enabled**: Any guild member can create resource requests via Discord
- **Disabled**: Only admins/designated roles can manage orders
- Use case: Democratic resource distribution vs. centralized control
- Example command: `/order create Metal Alloy 500`

### Bot Integration Workflow

#### For Server Owners:

1. **Add Bot to Discord Server**
   - Select server from dropdown
   - If bot not present, click "Add Bot to Server" button
   - Authorize with Administrator permissions
   - Refresh page to see configuration panel

2. **Configure Channels & Roles**
   - Select notification channels (where bot posts updates)
   - Select order channels (where users can request resources)
   - Assign admin roles (who can modify bot settings)
   - All fields support multiple selections

3. **Set Point Bonuses**
   - Adjust Discord order fulfillment bonus (0-200%)
   - Adjust website addition bonus (0-200%)
   - Balance between Discord and website engagement

4. **Enable Features**
   - Toggle auto-update embeds (recommended: ON)
   - Toggle website notifications (recommended: ON for active guilds)
   - Toggle public orders (ON for community-driven, OFF for admin-controlled)

5. **Save Configuration**
   - Click "Save Configuration" button
   - Settings are stored per Discord server
   - Each server can have completely different settings

#### For Discord Bot (Separate Python Bot):

The website provides the configuration API, but you need a Discord bot to use these features:

**Required Bot Setup:**
1. Create bot at Discord Developer Portal
2. Enable required intents: Server Members Intent
3. Copy bot token to `DISCORD_BOT_TOKEN` environment variable
4. Implement bot commands using your preferred framework (Discord.js, discord.py, etc.)
5. Read configuration from `/api/bot/config/{guildId}` endpoint

**Example Bot Features to Implement:**
- `/stock` - Show current resource levels (reads from website API)
- `/order create [item] [quantity]` - Create resource request
- `/order fill [order_id]` - Fulfill an order (awards bonus points)
- `/leaderboard` - Show top contributors
- Auto-update embeds when website data changes
- Post notifications when resources are added via website

**API Endpoints for Bot:**
- `GET /api/bot/config/{guildId}` - Get bot configuration
- `GET /api/resources?guildId={guildId}` - Get resources
- `GET /api/leaderboard?guildId={guildId}` - Get leaderboard
- `PUT /api/resources` - Update resources (awards points)

### Multi-Server Architecture

**1:1 Relationship Between Discord Servers and In-Game Guilds:**
- Each Discord server can link to ONE in-game guild only
- Each in-game guild can only be linked to ONE Discord server
- This prevents conflicts and ensures clear ownership

**Best Practices:**
1. **Clear Ownership**: Each in-game guild is managed by one Discord community
2. **Independent Configuration**: Each Discord server has separate bot settings (channels, roles, bonuses)
3. **Separate Tracking**: Leaderboards and activity logs are specific to each in-game guild
4. **Scalability**: Supports unlimited Discord servers, each with their own guild

**Example Scenarios:**
- **Single Organization**: One Discord server managing one in-game guild (most common)
- **Multiple Guilds**: Alliance with 3 Houses, each House has their own Discord server
- **Switching Guilds**: Contact admin to unlink and relink to a different guild (preserves old data)

### Troubleshooting

**Guild dropdown showing "No Guilds Available"?**
- This is normal during initial page load - wait 1-2 seconds
- The system automatically retries authentication and fetches guilds
- Guilds will appear automatically without manual refresh
- If issue persists after 5 seconds, try refreshing the page once
- Check that you've granted Discord OAuth permissions (identify, guilds, guilds.members.read)

**Bot not appearing in server list?**
- Ensure you have Administrator permissions or ownership
- Check OAuth scopes include `guilds` and `guilds.members.read`
- Try signing out and back in to refresh Discord token

**Can't save configuration?**
- Ensure bot is added to the server first
- Check that you selected at least one channel/role (or leave empty for none)
- Verify in-game guild is selected
- Check browser console for detailed error messages

**Bot commands not working?**
- Configuration is stored, but bot implementation is separate
- Refer to your Discord bot codebase (Discord.js/discord.py)
- Ensure bot has proper permissions in configured channels
- Check bot token is valid in environment variables

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute to this project.

## License

This project is open source. See [LICENSE](./LICENSE) for more information. 
