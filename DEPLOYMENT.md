# Deployment Guide: ResourceTracker to Vercel + Turso

## Prerequisites ✅
- [x] Turso database created
- [x] Database credentials obtained
- [x] Discord bot token configured
- [x] GitHub account ready

## Step 1: Upload to GitHub

1. **Create a new repository** on GitHub
2. **Push your code**:
   ```bash
   git init
   git add .
   git commit -m "Initial ResourceTracker setup"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ResourceTracker.git
   git push -u origin main
   ```

## Step 2: Deploy to Vercel

1. **Go to**: [https://vercel.com](https://vercel.com)
2. **Sign up** with GitHub account
3. **Click "New Project"**
4. **Import your GitHub repository**
5. **Configure Environment Variables** (see below)
6. **Click "Deploy"**

## Step 3: Set Environment Variables in Vercel

In Vercel project settings → Environment Variables, add:

### Required Variables:
```
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token
NEXTAUTH_SECRET=generate_a_random_32_character_string
NEXTAUTH_URL=https://your-app-name.vercel.app
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_GUILD_ID=your-discord-guild-id
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_ROLES_CONFIG=[]
```

### Optional Variables:
```
NEXT_PUBLIC_ORG_NAME=Dune Awakening Guild
```

## Step 4: Update Discord OAuth Callback

1. **Go to**: [Discord Developer Portal](https://discord.com/developers/applications)
2. **Select your application**
3. **OAuth2 → Redirects**
4. **Add**: `https://your-actual-vercel-url.vercel.app/api/auth/callback/discord`

## Step 5: Run Database Migration

After Vercel deployment:

1. **Update** `.env.production` with your actual Turso credentials
2. **Run migration**:
   ```bash
   node scripts/migrate-turso.js
   ```

## Step 6: Configure Role Permissions (Optional)

After deployment, if you want role-based permissions:

1. **Get Discord role IDs** from your server
2. **Update DISCORD_ROLES_CONFIG** in Vercel environment variables
3. **Redeploy** the application

## Step 7: Test Production Deployment

1. **Visit your Vercel URL**
2. **Test Discord login**
3. **Create/edit resources**
4. **Verify permissions**

## 🎉 You're Live!

Your ResourceTracker is now hosted on:
- **Database**: Turso (cloud SQLite)
- **Hosting**: Vercel (serverless)
- **Authentication**: Discord OAuth
- **Domain**: your-app.vercel.app

## Free Tier Limits:
- **Vercel**: 100GB bandwidth/month, unlimited projects
- **Turso**: 500 databases, 1B row reads, 1M row writes/month
- **Discord**: Unlimited OAuth usage

Perfect for guild resource tracking! 🚀