'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BotStatsCards } from '@/app/components/BotStatsCards'

interface Guild {
  id: string
  name: string
  hasConfiguration: boolean
  lastUpdated?: Date
}

interface BotConfig {
  guildId: string
  guildName: string | null
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

export default function BotDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null)
  const [config, setConfig] = useState<BotConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check permissions
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
    // Add permission check for hasBotAdminAccess when available
  }, [status, router])

  // Fetch guilds
  useEffect(() => {
    const fetchGuilds = async () => {
      try {
        console.log('[BOT-DASHBOARD] Fetching guilds...')
        const response = await fetch('/api/bot/guilds')
        console.log('[BOT-DASHBOARD] Response status:', response.status)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('[BOT-DASHBOARD] Error response:', errorData)
          throw new Error(errorData.error || 'Failed to fetch guilds')
        }
        
        const data = await response.json()
        console.log('[BOT-DASHBOARD] Guilds data:', data)
        setGuilds(data.guilds)
        if (data.guilds.length > 0) {
          setSelectedGuildId(data.guilds[0].id)
        }
      } catch (err) {
        console.error('[BOT-DASHBOARD] Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load guilds')
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchGuilds()
    }
  }, [status])

  // Fetch config when guild is selected
  useEffect(() => {
    const fetchConfig = async () => {
      if (!selectedGuildId) return

      try {
        const response = await fetch(`/api/bot/config/${selectedGuildId}`)
        if (!response.ok) throw new Error('Failed to fetch configuration')
        const data = await response.json()
        setConfig(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load configuration')
      }
    }

    if (selectedGuildId) {
      fetchConfig()
    }
  }, [selectedGuildId])

  const handleSaveConfig = async () => {
    if (!config || !selectedGuildId) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/bot/config/${selectedGuildId}`, {
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

        {/* Guild Selector */}
        {guilds.length > 0 ? (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Server
            </label>
            <select
              value={selectedGuildId || ''}
              onChange={(e) => setSelectedGuildId(e.target.value)}
              className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              {guilds.map((guild) => (
                <option key={guild.id} value={guild.id}>
                  {guild.name} {guild.hasConfiguration ? '✓' : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
            <p className="text-yellow-800 dark:text-yellow-200">
              No configured servers found. Add the bot to your Discord server and run the setup command.
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
              {/* Guild Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Server Name
                </label>
                <input
                  type="text"
                  value={config.guildName || ''}
                  onChange={(e) => setConfig({ ...config, guildName: e.target.value })}
                  placeholder="Enter server name"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Bot Channel ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bot Channel ID
                  <span className="text-gray-500 text-xs ml-2">(Where bot posts notifications)</span>
                </label>
                <input
                  type="text"
                  value={config.botChannelId || ''}
                  onChange={(e) => setConfig({ ...config, botChannelId: e.target.value })}
                  placeholder="e.g., 1234567890"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Order Channel ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Order Channel ID
                  <span className="text-gray-500 text-xs ml-2">(Where orders are created)</span>
                </label>
                <input
                  type="text"
                  value={config.orderChannelId || ''}
                  onChange={(e) => setConfig({ ...config, orderChannelId: e.target.value })}
                  placeholder="e.g., 1234567890"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Admin Role ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin Role ID
                  <span className="text-gray-500 text-xs ml-2">(Role that can access this dashboard)</span>
                </label>
                <input
                  type="text"
                  value={config.adminRoleId || ''}
                  onChange={(e) => setConfig({ ...config, adminRoleId: e.target.value })}
                  placeholder="e.g., 1234567890"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
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
        {selectedGuildId && (
          <BotStatsCards guildId={selectedGuildId} />
        )}

        {/* Placeholder for Activity Logs */}
        {selectedGuildId && (
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
