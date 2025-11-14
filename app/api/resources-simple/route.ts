import { NextRequest, NextResponse } from 'next/server'
import { db, resources } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get('guildId')
    
    console.log('[resources-simple] Fetching for guild:', guildId)
    const startTime = Date.now()
    
    // Use raw SQL to avoid any Drizzle type conversions
    const result = await db.all(
      sql`SELECT 
        id, guild_id as guildId, name, quantity, description, category, 
        icon, image_url as imageUrl, status, target_quantity as targetQuantity, 
        multiplier, last_updated_by as lastUpdatedBy,
        created_at as createdAt, updated_at as updatedAt
      FROM resources 
      WHERE guild_id = ${guildId}`
    )
    
    const queryTime = Date.now() - startTime
    console.log(`[resources-simple] Found ${result.length} resources in ${queryTime}ms`)
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, max-age=0',
      }
    })
  } catch (error) {
    console.error('[resources-simple] Error:', error)
    return NextResponse.json(
      { error: 'Failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
