'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BotStatsCards } from '@/app/components/BotStatsCards'

interface DiscordServer {
  id: string
  name: string
  icon: string | null
  isOwner: boolean
  hasBotInstalled?: boolean
}

interface InGameGuild {
  id: string
  title: string
  maxMembers: number
  leaderId: string | null
}

interface BotConfig {
  guildId: string
  inGameGuildId: string | null
  botChannelId: string[]
  orderChannelId: string[]
  adminRoleId: string[]
  autoUpdateEmbeds: boolean
  notifyOnWebsiteChanges: boolean
  orderFulfillmentBonus: number
  websiteBonusPercentage: number
  allowPublicOrders: boolean
  exists: boolean
}

interface DiscordChannel {
  id: string
  name: string
  position: number
}

interface DiscordRole {
  id: string
  name: string
  position: number
  color: number
}

interface DiscordGuildData {
  channels: DiscordChannel[]
  roles: DiscordRole[]
}

export default function BotDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Discord servers (where user is owner/admin)
  const [discordServers, setDiscordServers] = useState<DiscordServer[]>([])
  const [selectedDiscordServerId, setSelectedDiscordServerId] = useState<string | null>(null)
  
  // In-game guilds (House Melange, Whitelist, etc.)
  const [inGameGuilds, setInGameGuilds] = useState<InGameGuild[]>([])
  
  // Bot presence status
  const [botIsPresent, setBotIsPresent] = useState<boolean>(false)
  const [checkingBotStatus, setCheckingBotStatus] = useState(false)
  
  const [config, setConfig] = useState<BotConfig | null>(null)
  const [discordData, setDiscordData] = useState<DiscordGuildData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDocumentation, setShowDocumentation] = useState(false)
  
  // Bot invite URL
  const getBotInviteUrl = () => {
    if (!selectedDiscordServerId) return '#'
    // Use environment variable or fallback
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1421306946946076806'
    return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot&guild_id=${selectedDiscordServerId}`
  }

  // Check permissions
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  // Fetch user's Discord servers (where they are owner/admin)
  useEffect(() => {
    const fetchDiscordServers = async () => {
      try {
        const response = await fetch('/api/discord/user-servers')
        if (!response.ok) {
          throw new Error('Failed to fetch Discord servers')
        }
        
        const data = await response.json()
        
        // Check bot presence for all servers
        const serversWithBotStatus = await Promise.all(
          data.servers.map(async (server: DiscordServer) => {
            try {
              const botStatusResponse = await fetch(`/api/discord/bot-status/${server.id}`)
              const botStatus = await botStatusResponse.json()
              return {
                ...server,
                hasBotInstalled: botStatus.isPresent || false
              }
            } catch {
              return {
                ...server,
                hasBotInstalled: false
              }
            }
          })
        )
        
        // Sort: First by bot presence (installed first), then alphabetically by name
        const sortedServers = serversWithBotStatus.sort((a, b) => {
          // If bot status differs, prioritize servers with bot
          if (a.hasBotInstalled !== b.hasBotInstalled) {
            return a.hasBotInstalled ? -1 : 1
          }
          // Otherwise sort alphabetically
          return a.name.localeCompare(b.name)
        })
        
        setDiscordServers(sortedServers)
        if (sortedServers.length > 0) {
          setSelectedDiscordServerId(sortedServers[0].id)
        }
      } catch (err) {
        console.error('[BOT-DASHBOARD] Fetch Discord servers error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load Discord servers')
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchDiscordServers()
    }
  }, [status])

  // Fetch in-game guilds when Discord server is selected AND bot is present
  useEffect(() => {
    const fetchInGameGuilds = async () => {
      if (!selectedDiscordServerId || !botIsPresent) {
        setInGameGuilds([])
        return
      }

      try {
        const response = await fetch(`/api/guilds?discordServerId=${selectedDiscordServerId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch in-game guilds')
        }
        
        const data = await response.json()
        setInGameGuilds(data)
        
        // Reset in-game guild selection if current selection is not in the new list
        if (config?.inGameGuildId && !data.find((g: InGameGuild) => g.id === config.inGameGuildId)) {
          setConfig(config ? { ...config, inGameGuildId: null } : null)
        }
      } catch (err) {
        console.error('[BOT-DASHBOARD] Fetch in-game guilds error:', err)
        setInGameGuilds([])
      }
    }

    if (selectedDiscordServerId && botIsPresent) {
      fetchInGameGuilds()
    }
  }, [selectedDiscordServerId, botIsPresent])

  // Check if bot is present in selected Discord server
  useEffect(() => {
    const checkBotPresence = async () => {
      if (!selectedDiscordServerId) {
        setBotIsPresent(false)
        return
      }

      setCheckingBotStatus(true)
      try {
        const response = await fetch(`/api/discord/bot-status/${selectedDiscordServerId}`)
        if (response.ok) {
          const data = await response.json()
          setBotIsPresent(data.isPresent)
        } else {
          setBotIsPresent(false)
        }
      } catch (err) {
        console.error('[BOT-DASHBOARD] Failed to check bot status:', err)
        setBotIsPresent(false)
      } finally {
        setCheckingBotStatus(false)
      }
    }

    if (selectedDiscordServerId) {
      checkBotPresence()
    }
  }, [selectedDiscordServerId])

  // Fetch config when Discord server is selected AND bot is present
  useEffect(() => {
    const fetchConfig = async () => {
      if (!selectedDiscordServerId || !botIsPresent) {
        setConfig(null)
        return
      }

      try {
        const response = await fetch(`/api/bot/config/${selectedDiscordServerId}`)
        if (!response.ok) throw new Error('Failed to fetch configuration')
        const data = await response.json()
        setConfig(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load configuration')
      }
    }

    if (selectedDiscordServerId && botIsPresent) {
      fetchConfig()
    }
  }, [selectedDiscordServerId, botIsPresent])

  // Fetch Discord channels and roles when server is selected AND bot is present
  useEffect(() => {
    const fetchDiscordData = async () => {
      if (!selectedDiscordServerId || !botIsPresent) {
        setDiscordData(null)
        return
      }

      try {
        const response = await fetch(`/api/discord/guild/${selectedDiscordServerId}`)
        if (!response.ok) throw new Error('Failed to fetch Discord data')
        const data = await response.json()
        setDiscordData(data)
      } catch (err) {
        console.error('[BOT-DASHBOARD] Failed to fetch Discord data:', err)
        // Don't set error state, just log it - not critical
      }
    }

    if (selectedDiscordServerId && botIsPresent) {
      fetchDiscordData()
    }
  }, [selectedDiscordServerId, botIsPresent])

  // Close documentation modal with Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDocumentation) {
        setShowDocumentation(false)
      }
    }

    if (showDocumentation) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [showDocumentation])

  const handleSaveConfig = async () => {
    if (!config || !selectedDiscordServerId) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/bot/config/${selectedDiscordServerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save configuration')
      }

      const data = await response.json()
      setConfig(data.config)
      alert('Configuration saved successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading authentication...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Authentication Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please sign in with Discord to access the bot dashboard.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading bot dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Buttons */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          <button
            onClick={() => router.push('/resources')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Resources
          </button>
          <button
            onClick={() => setShowDocumentation(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 ml-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Documentation
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            🤖 Bot Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Configure and monitor your Discord bot settings
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Server Selectors */}
        {discordServers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Discord Server Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Discord Server
                <span className="text-gray-500 text-xs ml-2">(Your server to configure)</span>
              </label>
              <select
                value={selectedDiscordServerId || ''}
                onChange={(e) => setSelectedDiscordServerId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {discordServers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.hasBotInstalled ? '✅ ' : '⚠️ '}{server.name} {server.isOwner && '👑'}
                  </option>
                ))}
              </select>
              {selectedDiscordServerId && discordServers.find(s => s.id === selectedDiscordServerId) && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {discordServers.find(s => s.id === selectedDiscordServerId)?.hasBotInstalled 
                    ? '✅ Bot is installed in this server' 
                    : '⚠️ Bot needs to be added to this server'}
                </p>
              )}
            </div>

            {/* In-Game Guild Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                In-Game Guild
                <span className="text-gray-500 text-xs ml-2">(Which guild to track)</span>
              </label>
              <select
                value={config?.inGameGuildId || ''}
                onChange={(e) => setConfig(config ? { ...config, inGameGuildId: e.target.value || null } : null)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                disabled={!config}
              >
                <option value="">Select a guild...</option>
                {inGameGuilds.map((guild) => (
                  <option key={guild.id} value={guild.id}>
                    {guild.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center mb-6">
            <p className="text-yellow-800 dark:text-yellow-200">
              You don't have administrator access to any Discord servers. You need to be a server owner or have administrator permissions.
            </p>
          </div>
        )}

        {/* Bot Not Present - Show Add Bot UI */}
        {selectedDiscordServerId && !checkingBotStatus && !botIsPresent && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Bot Not Added to This Server
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                The Resource Tracker bot is not currently in this Discord server. Add the bot to start configuring resource tracking and order management.
              </p>
            </div>
            
            <a
              href={getBotInviteUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Add Bot to Server
            </a>
            
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              After adding the bot, refresh this page to configure settings
            </p>
          </div>
        )}

        {/* Checking Bot Status */}
        {checkingBotStatus && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Checking bot status...</p>
          </div>
        )}

        {/* Configuration Panel */}
        {config && botIsPresent && !checkingBotStatus && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Configuration
            </h2>

            <div className="space-y-4">
              {/* Bot Channel ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bot Channels
                  <span className="text-gray-500 text-xs ml-2">(Where bot posts notifications - hold Ctrl/Cmd to select multiple)</span>
                </label>
                {discordData && discordData.channels.length > 0 ? (
                  <select
                    multiple
                    value={config.botChannelId || []}
                    onChange={(e) => {
                      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
                      setConfig({ ...config, botChannelId: selectedOptions })
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                  >
                    {discordData.channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Loading channels...
                  </div>
                )}
                {config.botChannelId && config.botChannelId.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {config.botChannelId.map(channelId => {
                      const channel = discordData?.channels.find(c => c.id === channelId)
                      return channel ? (
                        <span key={channelId} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded">
                          #{channel.name}
                          <button
                            onClick={() => setConfig({ ...config, botChannelId: config.botChannelId.filter(id => id !== channelId) })}
                            className="ml-1 hover:text-blue-600 dark:hover:text-blue-200"
                          >
                            ×
                          </button>
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>

              {/* Order Channel ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Order Channels
                  <span className="text-gray-500 text-xs ml-2">(Where orders are created - hold Ctrl/Cmd to select multiple)</span>
                </label>
                {discordData && discordData.channels.length > 0 ? (
                  <select
                    multiple
                    value={config.orderChannelId || []}
                    onChange={(e) => {
                      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
                      setConfig({ ...config, orderChannelId: selectedOptions })
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                  >
                    {discordData.channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Loading channels...
                  </div>
                )}
                {config.orderChannelId && config.orderChannelId.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {config.orderChannelId.map(channelId => {
                      const channel = discordData?.channels.find(c => c.id === channelId)
                      return channel ? (
                        <span key={channelId} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded">
                          #{channel.name}
                          <button
                            onClick={() => setConfig({ ...config, orderChannelId: config.orderChannelId.filter(id => id !== channelId) })}
                            className="ml-1 hover:text-green-600 dark:hover:text-green-200"
                          >
                            ×
                          </button>
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>

              {/* Admin Role ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin Roles
                  <span className="text-gray-500 text-xs ml-2">(Roles that can access this dashboard - hold Ctrl/Cmd to select multiple)</span>
                </label>
                {discordData && discordData.roles.length > 0 ? (
                  <select
                    multiple
                    value={config.adminRoleId || []}
                    onChange={(e) => {
                      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
                      setConfig({ ...config, adminRoleId: selectedOptions })
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                  >
                    {discordData.roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Loading roles...
                  </div>
                )}
                {config.adminRoleId && config.adminRoleId.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {config.adminRoleId.map(roleId => {
                      const role = discordData?.roles.find(r => r.id === roleId)
                      return role ? (
                        <span key={roleId} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs rounded">
                          {role.name}
                          <button
                            onClick={() => setConfig({ ...config, adminRoleId: config.adminRoleId.filter(id => id !== roleId) })}
                            className="ml-1 hover:text-purple-600 dark:hover:text-purple-200"
                          >
                            ×
                          </button>
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>

              {/* Discord Order Fulfillment Bonus */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discord Order Fulfillment Bonus: {config.orderFulfillmentBonus}%
                  <span className="text-gray-500 text-xs ml-2">(Bonus points for filling orders via Discord)</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="10"
                  value={config.orderFulfillmentBonus}
                  onChange={(e) => setConfig({ ...config, orderFulfillmentBonus: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0% (1.0x)</span>
                  <span>50% (1.5x)</span>
                  <span>100% (2.0x)</span>
                  <span>200% (3.0x)</span>
                </div>
              </div>

              {/* Website Bonus */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Website Addition Bonus: {config.websiteBonusPercentage}%
                  <span className="text-gray-500 text-xs ml-2">(Bonus points for adding resources via website)</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="10"
                  value={config.websiteBonusPercentage}
                  onChange={(e) => setConfig({ ...config, websiteBonusPercentage: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0% (no bonus)</span>
                  <span>50% (1.5x)</span>
                  <span>100% (2.0x)</span>
                  <span>200% (3.0x)</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.autoUpdateEmbeds}
                    onChange={(e) => setConfig({ ...config, autoUpdateEmbeds: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Auto-update embeds
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.notifyOnWebsiteChanges}
                    onChange={(e) => setConfig({ ...config, notifyOnWebsiteChanges: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Notify on website changes
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.allowPublicOrders}
                    onChange={(e) => setConfig({ ...config, allowPublicOrders: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Allow public orders
                  </span>
                </label>
              </div>

              {/* Save Button */}
              <div className="pt-4">
                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        {selectedDiscordServerId && (
          <BotStatsCards guildId={selectedDiscordServerId} />
        )}

        {/* Placeholder for Activity Logs */}
        {selectedDiscordServerId && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Activity Log
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Activity log component coming soon...
            </p>
          </div>
        )}
      </div>

      {/* Documentation Modal */}
      {showDocumentation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Documentation
              </h2>
              <button
                onClick={() => setShowDocumentation(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 prose prose-sm dark:prose-invert max-w-none">
              <div className="space-y-6">
                <section>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">🤖 Discord Bot Configuration Guide</h3>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Quick Tip:</strong> Hold <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">Ctrl</kbd> (Windows/Linux) or <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">Cmd</kbd> (Mac) to select multiple channels or roles in the dropdowns below.
                    </p>
                  </div>

                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mt-4 mb-2">Server Selection & Sorting</h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Discord servers are automatically sorted in the following order:</p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                    <li><strong>Servers with bot installed</strong> (marked with ✅) appear first</li>
                    <li>Then alphabetically by server name</li>
                    <li>Servers without the bot (marked with ⚠️) appear at the bottom</li>
                    <li>Your owned servers show a 👑 crown icon</li>
                  </ol>

                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mt-6 mb-2">Multi-Select Channels & Roles</h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">You can select multiple channels and roles for each setting:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                    <li><strong>Bot Channels:</strong> Where the bot posts stock/inventory updates (blue tags)</li>
                    <li><strong>Order Channels:</strong> Where members can place orders (green tags)</li>
                    <li><strong>Admin Roles:</strong> Roles that can manage bot configuration (purple tags)</li>
                  </ul>
                  <p className="text-gray-700 dark:text-gray-300 mt-2">
                    Selected items appear as colored tags below the dropdown. Click the <strong>×</strong> on any tag to remove it.
                  </p>

                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mt-6 mb-2">Points System & Bonuses</h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    The <strong>Resource Update Bonus (%)</strong> field controls point multipliers when members update resources. This scales from 0% to 200%:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                    <li><strong>0%:</strong> Base points only (0.1 per resource added)</li>
                    <li><strong>50%:</strong> 1.5× multiplier (0.15 per resource)</li>
                    <li><strong>100%:</strong> 2× multiplier (0.2 per resource) - <em>Default</em></li>
                    <li><strong>200%:</strong> 3× multiplier (0.3 per resource) - <em>Maximum</em></li>
                  </ul>
                  <p className="text-gray-700 dark:text-gray-300 mt-2">
                    <strong>Note:</strong> Bonuses only apply to ADD actions, not SET or REMOVE operations.
                  </p>

                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mt-6 mb-2">Bot Behavior Toggles</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-gray-700 dark:text-gray-300 font-medium">✅ Auto-Update Discord Embeds</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm ml-4">
                        When enabled, the bot automatically updates stock embeds in Discord whenever resources change on the website. Disable this if you prefer manual updates.
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-700 dark:text-gray-300 font-medium">✅ Notify on Website Resource Changes</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm ml-4">
                        When enabled, the bot sends notifications to bot channels when resources are updated via the website. Useful for keeping the community informed.
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-700 dark:text-gray-300 font-medium">✅ Allow Public Orders</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm ml-4">
                        When enabled, any server member can place orders. When disabled, only users with admin roles can place orders (more restricted mode).
                      </p>
                    </div>
                  </div>

                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mt-6 mb-2">Workflow for Server Owners</h4>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                    <li>Select your Discord server from the dropdown (bot must be installed)</li>
                    <li>Link it to an in-game guild (the database that stores resources)</li>
                    <li>Choose bot channels where inventory updates will be posted</li>
                    <li>Choose order channels where members can request resources</li>
                    <li>Select admin roles that can manage the bot configuration</li>
                    <li>Set the resource update bonus percentage (0-200%)</li>
                    <li>Configure notification preferences with the three toggles</li>
                    <li>Click <strong>Save Configuration</strong></li>
                  </ol>

                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mt-6 mb-2">Multi-Server Best Practices</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                    <li>Each Discord server can link to one in-game guild</li>
                    <li>Multiple Discord servers can link to the same in-game guild (useful for alliances)</li>
                    <li>Each server can have different bonus percentages and notification settings</li>
                    <li>Admin roles are server-specific, not shared across servers</li>
                  </ul>

                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mt-6 mb-2">Troubleshooting</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-gray-700 dark:text-gray-300 font-medium">❌ Can't see my Discord server in the list?</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm ml-4">
                        Make sure you've granted the app permission to see your servers when logging in. Try logging out and back in, and check the OAuth permissions.
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-700 dark:text-gray-300 font-medium">⚠️ Server shows "Bot needs to be added to this server"?</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm ml-4">
                        The bot isn't installed on that server. Only servers where the bot is installed can be configured. Add the bot to your server first.
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-700 dark:text-gray-300 font-medium">🔄 Changes not saving?</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm ml-4">
                        Check the browser console for errors. Make sure you've selected at least one in-game guild. Verify you have admin permissions on the Discord server.
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-700 dark:text-gray-300 font-medium">📊 Bot not posting updates?</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm ml-4">
                        Ensure "Auto-Update Discord Embeds" is enabled. Check that the bot has permissions to post in the selected bot channels. Verify the channel IDs are correct.
                      </p>
                    </div>
                  </div>
                </section>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Need More Help?</h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    For complete documentation including API endpoints, deployment guides, and architecture details, see the full{' '}
                    <a 
                      href="https://github.com/RedSkiesIO/ResourceTracker" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      README on GitHub
                    </a>.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowDocumentation(false)}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
