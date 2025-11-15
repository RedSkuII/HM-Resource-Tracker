# 🔧 Fix: Old Data Still Showing

## Problem
You're seeing old data on the website because your **local `.env.local` file** points to a **local database** (`file:local.db`), but your **live website on Vercel** uses your **Turso production database**.

We reset the LOCAL database, but the PRODUCTION database (which your website uses) still has the old data.

## Solution

### Step 1: Get Your Production Turso Database URL

**Option A - From Vercel:**
1. Go to https://vercel.com/your-projects
2. Click on your Resource Tracker project
3. Go to **Settings** → **Environment Variables**
4. Find `TURSO_DATABASE_URL` - copy the value (starts with `libsql://`)

**Option B - From Turso Dashboard:**
1. Go to https://turso.tech/app
2. Click on your database
3. Copy the database URL (starts with `libsql://`)

### Step 2: Update Your Local .env.local File

Open `.env.local` in the ResourceTracker-main folder and change:

**FROM:**
```
TURSO_DATABASE_URL="file:local.db"
```

**TO:**
```
TURSO_DATABASE_URL="libsql://your-actual-database.turso.io"
```

(Replace `your-actual-database.turso.io` with your real Turso URL)

### Step 3: Run the Reset Script

Once you've updated `.env.local` with the correct production URL:

```powershell
cd c:\Users\colbi\OneDrive\Desktop\ResourceTracker-main
node scripts/setup-guilds-and-resources.js
```

This will now reset your **PRODUCTION** database (the one your website uses).

### Step 4: Verify

1. **Check the website:** Go to your Resource Tracker URL and refresh
2. **Select a guild:** Choose "House Melange" or "Whitelist Second Guild"
3. **Verify:** You should see 98 resources, all at 0/1000

## Quick Command

If you already know your Turso URL, run this (replace YOUR_URL):

```powershell
cd c:\Users\colbi\OneDrive\Desktop\ResourceTracker-main

# Update .env.local (replace YOUR_URL with actual URL)
(Get-Content .env.local) -replace 'TURSO_DATABASE_URL="file:local.db"', 'TURSO_DATABASE_URL="libsql://YOUR_URL"' | Set-Content .env.local

# Run the reset
node scripts/setup-guilds-and-resources.js
```

## What Happened?

1. ✅ We successfully reset the **local database** (file:local.db) 
2. ❌ But your **website** uses the **Turso cloud database**
3. 🔄 Need to run the reset script **against Turso** instead

## After Reset

Your website will show:
- **House Melange**: 98 resources at 0/1000
- **Whitelist Second Guild**: 98 resources at 0/1000
- **Leaderboard**: Empty
- **History**: Clean

Both your Discord bot and website will use the same production database.
