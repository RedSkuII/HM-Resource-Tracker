import { NextRequest, NextResponse } from 'next/server'

/**
 * DEPRECATED: PUT /api/guilds/[guildId]/roles
 * 
 * This endpoint is no longer used.
 * Guild access is now managed automatically via Discord roles created by the bot:
 * - /add-guild creates Member, Officer, and Leader roles
 * - /add-guildie, /set-officer, /set-leader assign these roles
 * - Website uses discord_role_id, discord_officer_role_id, discord_leader_role_id for access
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Guild roles are now managed automatically by the bot.',
      message: 'Use /add-guild to create a guild, then /add-guildie, /set-officer, /set-leader to manage members.'
    },
    { status: 410 } // 410 Gone - Resource permanently removed
  )
}

/**
 * DEPRECATED: GET /api/guilds/[guildId]/roles
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Guild roles are now managed automatically by the bot.',
      message: 'Guild members are managed via Discord bot commands.'
    },
    { status: 410 }
  )
}
