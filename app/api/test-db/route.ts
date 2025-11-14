import { NextRequest, NextResponse } from 'next/server'
import { db, resources } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('[TEST] Starting database test')
    const startTime = Date.now()
    
    // Simple count query
    const allResources = await db.select().from(resources).limit(5)
    
    const queryTime = Date.now() - startTime
    console.log(`[TEST] Query completed in ${queryTime}ms`)
    
    return NextResponse.json({
      success: true,
      queryTime: `${queryTime}ms`,
      sampleCount: allResources.length,
      firstResource: allResources[0] || null
    })
  } catch (error) {
    console.error('[TEST] Database error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
