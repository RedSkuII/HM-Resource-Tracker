import { NextRequest, NextResponse } from 'next/server'
import { db, resources } from '@/lib/db'
import { eq } from 'drizzle-orm'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get('guildId')
    
    console.log('[resources-simple] Fetching for guild:', guildId)
    const startTime = Date.now()
    
    // Simple query without complex type conversions
    let result
    if (guildId) {
      result = await db.select().from(resources).where(eq(resources.guildId, guildId))
    } else {
      result = await db.select().from(resources)
    }
    
    const queryTime = Date.now() - startTime
    console.log(`[resources-simple] Found ${result.length} resources in ${queryTime}ms`)
    
    // Return raw data without date conversions
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
