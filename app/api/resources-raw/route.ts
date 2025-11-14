import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get('guildId') || 'house-melange'
    
    console.log('[resources-raw] Fetching for guild:', guildId)
    const startTime = Date.now()
    
    // Use completely raw SQL with no ORM type conversions
    const rawQuery = `SELECT * FROM resources WHERE guild_id = '${guildId}' LIMIT 10`
    const result: any = await db.run(sql.raw(rawQuery))
    
    const queryTime = Date.now() - startTime
    console.log(`[resources-raw] Query took ${queryTime}ms`)
    
    return NextResponse.json({
      success: true,
      queryTime: `${queryTime}ms`,
      guildId,
      query: rawQuery,
      result: result
    })
  } catch (error) {
    console.error('[resources-raw] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
