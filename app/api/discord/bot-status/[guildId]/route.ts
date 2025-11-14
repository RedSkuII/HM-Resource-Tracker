import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Check if bot is in a specific Discord server
export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  try {
    const { guildId } = params
    const botToken = process.env.DISCORD_BOT_TOKEN

    if (!botToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 })
    }

    // Try to fetch the guild using the bot's token
    // If the bot is not in the guild, Discord API will return 404
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: {
        'Authorization': `Bot ${botToken}`,
      },
    })

    const isPresent = response.ok

    return NextResponse.json({
      isPresent,
      guildId,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      }
    })

  } catch (error) {
    console.error('[BOT-STATUS] Error checking bot status:', error)
    return NextResponse.json(
      { error: 'Failed to check bot status' },
      { status: 500 }
    )
  }
}
