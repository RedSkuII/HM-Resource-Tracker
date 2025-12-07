'use client'

import { useState, useEffect } from 'react'

interface Guild {
  id: string
  title: string
  discordGuildId: string
}

interface DiscordServerSectionsProps {
  allServerIds: string[]
  ownedServerIds: string[]
  serverRolesMap: Record<string, string[]>
}

export function DiscordServerSections({ 
  allServerIds, 
  ownedServerIds, 
  serverRolesMap,
}: DiscordServerSectionsProps) {
  const [guildsMap, setGuildsMap] = useState<Record<string, Guild[]>>({})
  const [serverNames, setServerNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const serversPerPage = 3

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[DiscordServerSections] Fetching data...')
        console.log('[DiscordServerSections] allServerIds:', allServerIds)
        console.log('[DiscordServerSections] serverRolesMap:', serverRolesMap)
        
        // Fetch in-game guilds for all servers
        const guildsResponse = await fetch('/api/guilds', {
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
        
        if (guildsResponse.ok) {
          const guilds: Guild[] = await guildsResponse.json()
          console.log('[DiscordServerSections] Fetched guilds:', guilds)
          
          // Group guilds by Discord server ID
          const grouped = guilds.reduce((acc, guild) => {
            if (!acc[guild.discordGuildId]) {
              acc[guild.discordGuildId] = []
            }
            acc[guild.discordGuildId].push(guild)
            return acc
          }, {} as Record<string, Guild[]>)
          
          console.log('[DiscordServerSections] Grouped guilds:', grouped)
          setGuildsMap(grouped)
        }

        // Fetch Discord server names from database
        const serversResponse = await fetch('/api/discord/servers', {
          headers: {
            'Cache-Control': 'no-cache',
          },
        })

        if (serversResponse.ok) {
          const serversData = await serversResponse.json()
          console.log('[DiscordServerSections] Server names data:', serversData)
          const names = serversData.servers.reduce((acc: Record<string, string>, server: any) => {
            acc[server.id] = server.name
            return acc
          }, {})
          console.log('[DiscordServerSections] Processed server names:', names)
          setServerNames(names)
        } else {
          console.error('[DiscordServerSections] Failed to fetch server names:', serversResponse.status)
        }
      } catch (error) {
        console.error('Error fetching Discord server data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading Discord servers...</p>
      </div>
    )
  }

  // Only show servers that have guilds configured (i.e., servers that use the bot)
  const serversWithBot = Object.keys(guildsMap).filter(serverId => allServerIds.includes(serverId))
  
  const totalPages = Math.ceil(serversWithBot.length / serversPerPage)
  const paginatedServerIds = serversWithBot.slice(
    currentPage * serversPerPage,
    (currentPage + 1) * serversPerPage
  )

  return (
    <div className="space-y-6">
      {serversWithBot.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            No Discord servers found with the bot installed. Make sure the bot is added to your server and guilds are configured.
          </p>
        </div>
      ) : paginatedServerIds.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No servers on this page</p>
        </div>
      ) : (
        paginatedServerIds.map((serverId) => {
          const roles = serverRolesMap[serverId] || []
          const guilds = guildsMap[serverId] || []
          const isOwned = ownedServerIds.includes(serverId)
          const serverName = serverNames[serverId] || `Server ${serverId.substring(0, 8)}...`

          return (
            <div
              key={serverId}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Server Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-800 flex items-center justify-center text-white font-bold text-lg">
                    {serverName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{serverName}</h3>
                    <p className="text-xs text-indigo-200">
                      {isOwned && '👑 Owner • '}
                      Discord Server ID: {serverId}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Discord Roles Section */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                    Discord Roles ({roles.length})
                  </h4>
                  {roles.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {roles.map((roleId) => (
                        <div
                          key={roleId}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 mr-2 mb-2"
                          title={`Role ID: ${roleId}`}
                        >
                          Role {roleId.substring(0, 8)}...
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      No roles on this server
                    </p>
                  )}
                </div>

                {/* In-Game Guilds Section */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                    </svg>
                    In-Game Guilds ({guilds.length})
                  </h4>
                  {guilds.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {guilds.map((guild) => (
                        <div
                          key={guild.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {guild.title}
                          </span>
                          <button
                            onClick={() => window.location.href = `/resources?guildId=${guild.id}`}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            title="View resources for this guild"
                          >
                            View Resources →
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      No guilds configured for this server
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}

      {/* Pagination Controls */}
      {serversWithBot.length > serversPerPage && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Previous page"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Next page"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
