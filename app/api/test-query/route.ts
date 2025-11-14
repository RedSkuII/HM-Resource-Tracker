import { NextRequest, NextResponse } from 'next/server'
import { db, resources } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    console.log('[test-query] Starting query...')
    
    const guildId = 'house-melange'
    const allResources = await db.select().from(resources).where(eq(resources.guildId, guildId))
    
    const queryTime = Date.now() - startTime
    console.log(`[test-query] Query completed in ${queryTime}ms`)
    
    return NextResponse.json({
      success: true,
      queryTime: `${queryTime}ms`,
      resourceCount: allResources.length,
      firstResource: allResources[0] || null,
      lastResource: allResources[allResources.length - 1] || null
    })
  } catch (error) {
    console.error('[test-query] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
}
