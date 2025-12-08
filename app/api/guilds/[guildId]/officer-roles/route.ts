import { NextRequest, NextResponse } from 'next/server'

/**
 * DEPRECATED: PUT /api/guilds/[guildId]/officer-roles
 * 
 * This endpoint is no longer used.
 * Guild officer roles are now managed automatically via Discord roles created by the bot:
 * - /add-guild creates Member, Officer, and Leader roles
 * - /set-officer assigns Officer role (removes Member role)
 * - Website uses discord_officer_role_id for officer access
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Guild officer roles are now managed automatically by the bot.',
      message: 'Use /set-officer to promote members to officers.'
    },
    { status: 410 } // 410 Gone - Resource permanently removed
  )
}

/**
 * DEPRECATED: GET /api/guilds/[guildId]/officer-roles
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Guild officer roles are now managed automatically by the bot.',
      message: 'Guild officers are managed via Discord bot commands.'
    },
    { status: 410 }
  )
}
