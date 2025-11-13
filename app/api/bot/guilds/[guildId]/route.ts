import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasBotAdminAccess } from '@/lib/discord-roles'

export const dynamic = 'force-dynamic'

// GET - Fetch guild channels and roles from Discord bot API
// This would typically be called by fetching from your bot's API endpoint
// For now, returns a structure that can be populated manually or via bot webhook
export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has bot admin access
    if (!hasBotAdminAccess(session.user.roles)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { guildId } = params

    // TODO: In production, this would call your Discord bot's API
    // to fetch real-time channel and role information for the guild
    // For now, return a placeholder response
    
    // Example bot API call (implement later):
    // const botResponse = await fetch(`${process.env.BOT_API_URL}/guilds/${guildId}/details`, {
    //   headers: { 'Authorization': `Bearer ${process.env.BOT_API_TOKEN}` }
    // })

    return NextResponse.json({
      guildId,
      channels: [],
      roles: [],
      message: 'Guild details would be fetched from bot API. Implement bot API endpoint to populate this data.'
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      }
    })

  } catch (error) {
    console.error('Error fetching guild details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guild details' },
      { status: 500 }
    )
  }
}
