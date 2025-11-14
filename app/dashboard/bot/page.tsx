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
  botChannelId: string | null
  orderChannelId: string | null
  adminRoleId: string | null
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
  
  const [config, setConfig] = useState<BotConfig | null>(null)
  const [discordData, setDiscordData] = useState<DiscordGuildData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        setDiscordServers(data.servers)
        if (data.servers.length > 0) {
          setSelectedDiscordServerId(data.servers[0].id)
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

  // Fetch in-game guilds when Discord server is selected
  useEffect(() => {
    const fetchInGameGuilds = async () => {
      if (!selectedDiscordServerId) {
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

    if (selectedDiscordServerId) {
      fetchInGameGuilds()
    }
  }, [selectedDiscordServerId])

  // Fetch config when Discord server is selected
  useEffect(() => {
    const fetchConfig = async () => {
      if (!selectedDiscordServerId) return

      try {
        const response = await fetch(`/api/bot/config/${selectedDiscordServerId}`)
        if (!response.ok) throw new Error('Failed to fetch configuration')
        const data = await response.json()
        setConfig(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load configuration')
      }
    }

    if (selectedDiscordServerId) {
      fetchConfig()
    }
  }, [selectedDiscordServerId])

  // Fetch Discord channels and roles when server is selected
  useEffect(() => {
    const fetchDiscordData = async () => {
      if (!selectedDiscordServerId) return

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

    if (selectedDiscordServerId) {
      fetchDiscordData()
    }
  }, [selectedDiscordServerId])

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
        <div className="mb-6 flex gap-3">
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
                    {server.name} {server.isOwner && '👑'}
                  </option>
                ))}
              </select>
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

        {/* Configuration Panel */}
        {config && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Configuration
            </h2>

            <div className="space-y-4">
              {/* Bot Channel ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bot Channel
                  <span className="text-gray-500 text-xs ml-2">(Where bot posts notifications)</span>
                </label>
                {discordData && discordData.channels.length > 0 ? (
                  <select
                    value={config.botChannelId || ''}
                    onChange={(e) => setConfig({ ...config, botChannelId: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a channel...</option>
                    {discordData.channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name} {config.botChannelId === channel.id && '✓ (current)'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Loading channels...
                  </div>
                )}
              </div>

              {/* Order Channel ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Order Channel
                  <span className="text-gray-500 text-xs ml-2">(Where orders are created)</span>
                </label>
                {discordData && discordData.channels.length > 0 ? (
                  <select
                    value={config.orderChannelId || ''}
                    onChange={(e) => setConfig({ ...config, orderChannelId: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a channel...</option>
                    {discordData.channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name} {config.orderChannelId === channel.id && '✓ (current)'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Loading channels...
                  </div>
                )}
              </div>

              {/* Admin Role ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin Role
                  <span className="text-gray-500 text-xs ml-2">(Role that can access this dashboard)</span>
                </label>
                {discordData && discordData.roles.length > 0 ? (
                  <select
                    value={config.adminRoleId || ''}
                    onChange={(e) => setConfig({ ...config, adminRoleId: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a role...</option>
                    {discordData.roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} {config.adminRoleId === role.id && '✓ (current)'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Loading roles...
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
    </div>
  )
}
