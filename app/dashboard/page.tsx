import { getServerSession } from 'next-auth'
import { authOptions, getDisplayName } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { RefreshRolesButton } from '../components/RefreshRolesButton'
import { ClientNavigation } from '../components/ClientNavigation'
import { NicknameSettings } from '../components/NicknameSettings'
import { DiscordServerSections } from '../components/DiscordServerSections'

export default async function Dashboard() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/')
  }

  // Check if user has any required roles for site access
  if (!session.user.permissions?.hasResourceAccess) {
    redirect('/')
  }

  const displayName = getDisplayName(session.user)

  // Debug logging for troubleshooting
  console.log('[DASHBOARD] Session user data:', {
    id: session.user.id,
    name: session.user.name,
    allServerIds: session.user.allServerIds,
    ownedServerIds: session.user.ownedServerIds,
    serverRolesMapKeys: Object.keys(session.user.serverRolesMap || {}),
    serverRolesMap: session.user.serverRolesMap,
  })

  return (
    <div className="min-h-screen bg-sand-50 dark:bg-gray-900 transition-colors duration-300">
      <ClientNavigation title={process.env.NEXT_PUBLIC_ORG_NAME || 'Guildgamesh'} showDashboardLink={false} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              Welcome back, {displayName}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your profile and view your permissions</p>
          </header>

          {/* Resource Management - Prominent Section */}
          {session.user.permissions?.hasResourceAccess && (
            <div className="mb-8">
              <div className="bg-guildgamesh-gradient rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Resource Management</h2>
                    <p className="text-sand-100 mb-4">
                      Track, update, and monitor all your resources in real-time
                    </p>
                    <Link
                      href="/resources"
                      className="bg-white text-primary-600 hover:bg-sand-50 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 inline-flex"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      Manage Resources
                    </Link>
                  </div>
                  <div className="hidden md:block">
                    <svg className="w-20 h-20 text-sand-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Profile</h2>
              <div className="space-y-3">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt="Profile"
                    className="w-16 h-16 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{displayName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{session.user.email}</p>
                  {session.user.discordNickname && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Discord: {session.user.discordNickname}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Community Status Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Community Status</h2>
                <RefreshRolesButton />
              </div>
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    session.user.isInGuild ? 'bg-green-500' : 'bg-red-500'
                  }`}></span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {session.user.isInGuild ? 'Community Member' : 'Not in Community'}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Discord Servers:</span>
                  <span className="text-sm text-primary-600 dark:text-primary-400 ml-1">{session.user.allServerIds?.length || 0} server(s)</span>
                </div>
                {session.user.ownedServerIds && session.user.ownedServerIds.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Owned Servers:</span>
                    <span className="text-sm text-sand-600 dark:text-sand-400 ml-1">{session.user.ownedServerIds.length} server(s)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Discord Servers & Guilds Section */}
          <div className="mt-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Your Discord Servers</h2>
              <p className="text-gray-600 dark:text-gray-400">
                View your Discord roles and in-game guilds for each server you're a member of
              </p>
            </div>
            <DiscordServerSections
              allServerIds={session.user.allServerIds || []}
              ownedServerIds={session.user.ownedServerIds || []}
              serverRolesMap={session.user.serverRolesMap || {}}
              serverNames={session.user.serverNames || {}}
              roleNames={session.user.roleNames || {}}
            />
          </div>

          {/* Nickname Settings - Simplified */}
          <div className="mt-8">
            <NicknameSettings />
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                  href="/dashboard/activity"
                  className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-sand-600 dark:text-sand-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                    </svg>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">Activity Log</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">View your activity history</p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/dashboard/privacy"
                  className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-primary-600 dark:text-primary-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">Privacy & Data</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Manage your data and privacy</p>
                    </div>
                  </div>
                </Link>

                {/* Bot Dashboard - Only show to admins */}
                {session.user.permissions?.hasResourceAdminAccess && (
                  <Link
                    href="/dashboard/bot"
                    className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-sand-600 dark:text-sand-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">Bot Dashboard</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Configure Discord bot settings</p>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 