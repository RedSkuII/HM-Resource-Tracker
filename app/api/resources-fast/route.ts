import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { eq } from 'drizzle-orm'

// Minimal schema definition
const resources = sqliteTable('resources', {
  id: text('id').primaryKey(),
  guildId: text('guild_id'),
  name: text('name').notNull(),
  quantity: integer('quantity').notNull().default(0),
  description: text('description'),
  category: text('category').notNull(),
  icon: text('icon'),
  imageUrl: text('image_url'),
  status: text('status'),
  targetQuantity: integer('target_quantity'),
  multiplier: real('multiplier').notNull().default(1.0),
  lastUpdatedBy: text('last_updated_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    console.log('[resources-fast] Starting request')
    
    // Create fresh DB connection
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })
    const db = drizzle(client)
    
    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get('guildId')
    console.log('[resources-fast] Guild ID:', guildId)
    
    let allResources
    if (guildId) {
      allResources = await db.select().from(resources).where(eq(resources.guildId, guildId))
    } else {
      allResources = await db.select().from(resources)
    }
    
    const queryTime = Date.now() - startTime
    console.log(`[resources-fast] Completed in ${queryTime}ms, ${allResources.length} resources`)
    
    return NextResponse.json(allResources, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('[resources-fast] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch resources', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
