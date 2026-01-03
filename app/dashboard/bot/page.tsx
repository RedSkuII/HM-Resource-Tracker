'use client'
// Guildgamesh sand theme site-wide (updated Dec 12 2025 - cache bust v4)

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
  roleIds?: string[]
  officerRoleIds?: string[]
  defaultRoleId?: string | null
  // Bot configuration (per guild)
  orderChannelId?: string[]
  adminRoleId?: string[]
  autoUpdateEmbeds?: boolean
  notifyOnWebsiteChanges?: boolean
  orderFulfillmentBonus?: number
  websiteBonusPercentage?: number
}

// Legacy BotConfig interface - DEPRECATED (now using guild-specific config in InGameGuild interface)
// interface BotConfig {
//   guildId: string
//   inGameGuildId: string | null
//   botChannelId: string[]
//   orderChannelId: string[]
//   adminRoleId: string[]
//   autoUpdateEmbeds: boolean
//   notifyOnWebsiteChanges: boolean
//   orderFulfillmentBonus: number
//   websiteBonusPercentage: number
//   allowPublicOrders: boolean
//   exists: boolean
// }

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

interface ActivityLog {
  id: string
  guildId: string
  eventType: string
  userId: string | null
  username: string | null
  resourceId: string | null
  resourceName: string | null
  quantity: number | null
  pointsAwarded: number | null
  details: any
  createdAt: Date
}

export default function BotDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Discord servers (where user is owner/admin)
  const [discordServers, setDiscordServers] = useState<DiscordServer[]>([])
  const [selectedDiscordServerId, setSelectedDiscordServerId] = useState<string | null>(null)
  
  // In-game guilds (House Melange, Whitelist, etc.)
  const [inGameGuilds, setInGameGuilds] = useState<InGameGuild[]>([])
  const [selectedInGameGuildId, setSelectedInGameGuildId] = useState<string | null>(null)
  
  // Bot presence status
  const [botIsPresent, setBotIsPresent] = useState<boolean>(false)
  const [checkingBotStatus, setCheckingBotStatus] = useState(false)
  
  // Legacy config state - DEPRECATED (now using guild-specific config in inGameGuilds)
  // const [config, setConfig] = useState<BotConfig | null>(null)
  const [discordData, setDiscordData] = useState<DiscordGuildData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDocumentation, setShowDocumentation] = useState(false)
  
  // Activity logs
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  
  // Guild roles management
  const [savingGuildRoles, setSavingGuildRoles] = useState<string | null>(null)
  const [savingOfficerRoles, setSavingOfficerRoles] = useState<string | null>(null)
  const [savingDefaultRole, setSavingDefaultRole] = useState<string | null>(null)
  const [expandedGuild, setExpandedGuild] = useState<string | null>(null)
  
  // Delete resources confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingResources, setDeletingResources] = useState(false)
  
  // Delete guild confirmation
  const [showDeleteGuildConfirm, setShowDeleteGuildConfirm] = useState(false)
  const [deletingGuild, setDeletingGuild] = useState(false)
  
  // Reset to defaults confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resettingResources, setResettingResources] = useState(false)
  
  // Fetch guild-specific roles (access roles and officer roles)
  const fetchGuildRoles = async (guildId: string) => {
    try {
      const response = await fetch(`/api/guilds/${guildId}/roles`)
      if (!response.ok) {
        throw new Error('Failed to fetch guild roles')
      }
      
      const data = await response.json()
      
      // Also fetch officer roles
      const officerResponse = await fetch(`/api/guilds/${guildId}/officer-roles`)
      const officerData = officerResponse.ok ? await officerResponse.json() : { roleIds: [] }
      
      // Update the guild with all role data
      setInGameGuilds(prev => 
        prev.map(g => g.id === guildId ? { 
          ...g, 
          roleIds: data.roleIds, 
          officerRoleIds: officerData.roleIds || [],
          defaultRoleId: data.defaultRoleId || null 
        } : g)
      )
    } catch (err) {
      console.error(`[BOT-DASHBOARD] Error fetching roles for guild ${guildId}:`, err)
    }
  }

  // Fetch guild-specific bot configuration (channels, bonuses, etc.)
  const fetchGuildConfig = async (guildId: string) => {
    try {
      const response = await fetch(`/api/guilds/${guildId}/config`)
      if (!response.ok) {
        console.warn(`[BOT-DASHBOARD] No config found for guild ${guildId}, using defaults`)
        return
      }
      
      const data = await response.json()
      
      // Update the guild with configuration data
      setInGameGuilds(prev => 
        prev.map(g => g.id === guildId ? { 
          ...g,
          orderChannelId: data.orderChannelId || [],
          adminRoleId: data.adminRoleId || [],
          autoUpdateEmbeds: data.autoUpdateEmbeds ?? true,
          notifyOnWebsiteChanges: data.notifyOnWebsiteChanges ?? true,
          orderFulfillmentBonus: data.orderFulfillmentBonus ?? 0,
          websiteBonusPercentage: data.websiteBonusPercentage ?? 0,
        } : g)
      )
    } catch (err) {
      console.error(`[BOT-DASHBOARD] Error fetching config for guild ${guildId}:`, err)
    }
  }

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
        
        // Fetch role requirements for each guild
        data.forEach((guild: InGameGuild) => {
          fetchGuildRoles(guild.id)
        })
        
        // Reset in-game guild selection if current selection is not in the new list
        if (selectedInGameGuildId && !data.find((g: InGameGuild) => g.id === selectedInGameGuildId)) {
          setSelectedInGameGuildId(null)
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

  // Fetch guild-specific configuration when in-game guild selection changes
  useEffect(() => {
    if (selectedInGameGuildId) {
      fetchGuildRoles(selectedInGameGuildId)
      fetchGuildConfig(selectedInGameGuildId)
    }
  }, [selectedInGameGuildId])

  // Legacy fetchConfig - REMOVED (now using fetchGuildConfig which is called when guild selection changes)

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

  // Fetch activity logs when server is selected AND bot is present
  useEffect(() => {
    const fetchActivityLogs = async () => {
      if (!selectedDiscordServerId || !botIsPresent) {
        setActivityLogs([])
        return
      }

      setLoadingLogs(true)
      try {
        const response = await fetch(`/api/bot/activity/${selectedDiscordServerId}`)
        if (!response.ok) throw new Error('Failed to fetch activity logs')
        const data = await response.json()
        setActivityLogs(data)
      } catch (err) {
        console.error('[BOT-DASHBOARD] Failed to fetch activity logs:', err)
        setActivityLogs([])
      } finally {
        setLoadingLogs(false)
      }
    }

    if (selectedDiscordServerId && botIsPresent) {
      fetchActivityLogs()
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
    if (!selectedInGameGuildId) return

    const currentGuild = inGameGuilds.find(g => g.id === selectedInGameGuildId)
    if (!currentGuild) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/guilds/${selectedInGameGuildId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderChannelId: currentGuild.orderChannelId || [],
          adminRoleId: currentGuild.adminRoleId || [],
          autoUpdateEmbeds: currentGuild.autoUpdateEmbeds ?? true,
          notifyOnWebsiteChanges: currentGuild.notifyOnWebsiteChanges ?? true,
          orderFulfillmentBonus: currentGuild.orderFulfillmentBonus ?? 0,
          websiteBonusPercentage: currentGuild.websiteBonusPercentage ?? 0,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save configuration')
      }

      alert('Configuration saved successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateGuildRoles = async (guildId: string, roleIds: string[]) => {
    setSavingGuildRoles(guildId)
    setError(null)

    try {
      const response = await fetch(`/api/guilds/${guildId}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update guild roles')
      }

      // Update local state
      setInGameGuilds(prev => 
        prev.map(g => g.id === guildId ? { ...g, roleIds } : g)
      )

      alert(`Guild roles updated successfully!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update guild roles')
    } finally {
      setSavingGuildRoles(null)
    }
  }

  const handleUpdateOfficerRoles = async (guildId: string, roleIds: string[]) => {
    setSavingOfficerRoles(guildId)
    setError(null)

    try {
      const response = await fetch(`/api/guilds/${guildId}/officer-roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update officer roles')
      }

      // Update local state
      setInGameGuilds(prev => 
        prev.map(g => g.id === guildId ? { ...g, officerRoleIds: roleIds } : g)
      )

      alert(`Guild officer roles updated successfully!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update officer roles')
    } finally {
      setSavingOfficerRoles(null)
    }
  }

  const handleUpdateDefaultRole = async (guildId: string, defaultRoleId: string | null) => {
    setSavingDefaultRole(guildId)
    setError(null)

    try {
      const response = await fetch(`/api/guilds/${guildId}/default-role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultRoleId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update default role')
      }

      // Update local state
      setInGameGuilds(prev => 
        prev.map(g => g.id === guildId ? { ...g, defaultRoleId } : g)
      )

      alert(`Default role updated successfully!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update default role')
    } finally {
      setSavingDefaultRole(null)
    }
  }

  const handleDeleteAllResources = async () => {
    if (!selectedInGameGuildId) return

    setDeletingResources(true)
    setError(null)

    try {
      const response = await fetch(`/api/guilds/${selectedInGameGuildId}/delete-resources`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete resources')
      }

      const data = await response.json()
      alert(`✅ All resources for "${data.guildTitle}" have been successfully deleted!`)
      setShowDeleteConfirm(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete resources'
      setError(errorMessage)
      alert(`❌ Error: ${errorMessage}`)
    } finally {
      setDeletingResources(false)
    }
  }

  const handleDeleteGuild = async () => {
    if (!selectedInGameGuildId) return

    setDeletingGuild(true)
    setError(null)

    try {
      const response = await fetch(`/api/guilds/${selectedInGameGuildId}/delete-guild`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete guild')
      }

      const data = await response.json()
      alert(`✅ Guild "${data.guildTitle}" has been permanently deleted!\n\nDeleted ${data.deletedResourceCount} resources and all associated data.`)
      setShowDeleteGuildConfirm(false)
      
      // Refresh the page to update guild list
      window.location.reload()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete guild'
      setError(errorMessage)
      alert(`❌ Error: ${errorMessage}`)
    } finally {
      setDeletingGuild(false)
    }
  }

  const handleResetToDefaults = async () => {
    if (!selectedInGameGuildId) return

    setResettingResources(true)
    setError(null)

    try {
      const guildTitle = inGameGuilds.find(g => g.id === selectedInGameGuildId)?.title || selectedInGameGuildId

      const response = await fetch('/api/guilds/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guildId: selectedInGameGuildId,
          guildTitle: guildTitle,
          reset: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reset resources')
      }

      const data = await response.json()
      alert(`✅ Guild "${guildTitle}" has been reset to default resources!\n\n${data.resourcesCreated} default resources created with zero quantities.\nAll history and leaderboard data has been cleared.`)
      setShowResetConfirm(false)
      
      // Refresh the page to show updated resources
      window.location.reload()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset resources'
      setError(errorMessage)
      alert(`❌ Error: ${errorMessage}`)
    } finally {
      setResettingResources(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-guildgamesh-50 dark:bg-gradient-to-br dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading authentication...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-guildgamesh-50 dark:bg-gradient-to-br dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 flex items-center justify-center">
        <div className="text-center bg-guildgamesh-100 dark:bg-stone-800 rounded-lg shadow-lg p-8 max-w-md border border-guildgamesh-300 dark:border-primary-700/40">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Authentication Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please sign in with Discord to access the bot dashboard.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-guildgamesh-50 dark:bg-gradient-to-br dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading bot dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-guildgamesh-50 dark:bg-gradient-to-br dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Buttons */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-sand-200 hover:bg-sand-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-gray-900 dark:text-white font-medium rounded-lg transition-colors flex items-center gap-2 border border-sand-300 dark:border-primary-700/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          <button
            onClick={() => router.push('/resources')}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
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
                className="w-full px-4 py-2 border border-guildgamesh-300 dark:border-primary-700/40 rounded-lg bg-white dark:bg-stone-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
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
                value={selectedInGameGuildId || ''}
                onChange={(e) => setSelectedInGameGuildId(e.target.value || null)}
                className="w-full px-4 py-2 border border-guildgamesh-300 dark:border-primary-700/40 rounded-lg bg-white dark:bg-stone-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
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
          <div className="bg-guildgamesh-100 dark:bg-stone-800 rounded-lg shadow-lg p-8 mb-6 text-center border border-guildgamesh-300 dark:border-primary-700/40">
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
                The Guildgamesh bot is not currently in this Discord server. Add the bot to start configuring resource tracking and order management.
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
          <div className="bg-guildgamesh-100 dark:bg-stone-800 rounded-lg shadow-lg p-8 mb-6 text-center border border-guildgamesh-300 dark:border-primary-700/40">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Checking bot status...</p>
          </div>
        )}

        {/* Configuration Panel */}
        {selectedInGameGuildId && botIsPresent && !checkingBotStatus && (
          <div className="bg-guildgamesh-100 dark:bg-stone-800 rounded-lg shadow-lg p-6 mb-6 border border-guildgamesh-300 dark:border-primary-700/40">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Configuration for {inGameGuilds.find(g => g.id === selectedInGameGuildId)?.title || 'Guild'}
            </h2>

            <div className="space-y-4">
              {/* Order Channel ID */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Order Channels
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Select Discord channels where members can place resource orders. You can select multiple channels for different purposes.
                </p>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Order Request Channels (hold Ctrl/Cmd to select multiple)
                </label>
                {discordData && discordData.channels.length > 0 ? (
                  <select
                    multiple
                    value={inGameGuilds.find(g => g.id === selectedInGameGuildId)?.orderChannelId || []}
                    onChange={(e) => {
                      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
                      setInGameGuilds(prev =>
                        prev.map(g => g.id === selectedInGameGuildId ? { ...g, orderChannelId: selectedOptions } : g)
                      )
                    }}
                    className="w-full px-4 py-2 border border-guildgamesh-300 dark:border-primary-700/40 rounded-lg bg-white dark:bg-stone-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 min-h-[120px]"
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
                {inGameGuilds.find(g => g.id === selectedInGameGuildId)?.orderChannelId && inGameGuilds.find(g => g.id === selectedInGameGuildId)!.orderChannelId!.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {inGameGuilds.find(g => g.id === selectedInGameGuildId)!.orderChannelId!.map(channelId => {
                      const channel = discordData?.channels.find(c => c.id === channelId)
                      return channel ? (
                        <span key={channelId} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded">
                          #{channel.name}
                          <button
                            onClick={() => {
                              const currentGuild = inGameGuilds.find(g => g.id === selectedInGameGuildId)
                              const newChannelIds = currentGuild?.orderChannelId?.filter(id => id !== channelId) || []
                              setInGameGuilds(prev =>
                                prev.map(g => g.id === selectedInGameGuildId ? { ...g, orderChannelId: newChannelIds } : g)
                              )
                            }}
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

              {/* Discord Order Fulfillment Bonus */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discord Order Fulfillment Bonus: {inGameGuilds.find(g => g.id === selectedInGameGuildId)?.orderFulfillmentBonus ?? 0}%
                  <span className="text-gray-500 text-xs ml-2">(Bonus points for filling orders via Discord)</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="10"
                  value={inGameGuilds.find(g => g.id === selectedInGameGuildId)?.orderFulfillmentBonus ?? 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    setInGameGuilds(prev =>
                      prev.map(g => g.id === selectedInGameGuildId ? { ...g, orderFulfillmentBonus: value } : g)
                    )
                  }}
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
                  Website Addition Bonus: {inGameGuilds.find(g => g.id === selectedInGameGuildId)?.websiteBonusPercentage ?? 0}%
                  <span className="text-gray-500 text-xs ml-2">(Bonus points for adding resources via website)</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="10"
                  value={inGameGuilds.find(g => g.id === selectedInGameGuildId)?.websiteBonusPercentage ?? 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    setInGameGuilds(prev =>
                      prev.map(g => g.id === selectedInGameGuildId ? { ...g, websiteBonusPercentage: value } : g)
                    )
                  }}
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
                    checked={inGameGuilds.find(g => g.id === selectedInGameGuildId)?.autoUpdateEmbeds ?? true}
                    onChange={(e) => {
                      setInGameGuilds(prev =>
                        prev.map(g => g.id === selectedInGameGuildId ? { ...g, autoUpdateEmbeds: e.target.checked } : g)
                      )
                    }}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Auto-update embeds
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={inGameGuilds.find(g => g.id === selectedInGameGuildId)?.notifyOnWebsiteChanges ?? true}
                    onChange={(e) => {
                      setInGameGuilds(prev =>
                        prev.map(g => g.id === selectedInGameGuildId ? { ...g, notifyOnWebsiteChanges: e.target.checked } : g)
                      )
                    }}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Notify on website changes
                  </span>
                </label>

              </div>

              {/* Admin Role ID */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Admin Roles
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Select Discord roles that can access this bot configuration dashboard. These users have full control over bot settings.
                </p>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bot Admin Roles (hold Ctrl/Cmd to select multiple)
                </label>
                {discordData && discordData.roles.length > 0 ? (
                  <select
                    multiple
                    value={inGameGuilds.find(g => g.id === selectedInGameGuildId)?.adminRoleId || []}
                    onChange={(e) => {
                      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
                      setInGameGuilds(prev =>
                        prev.map(g => g.id === selectedInGameGuildId ? { ...g, adminRoleId: selectedOptions } : g)
                      )
                    }}
                    className="w-full px-4 py-2 border border-guildgamesh-300 dark:border-primary-700/40 rounded-lg bg-white dark:bg-stone-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 min-h-[120px]"
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
                {inGameGuilds.find(g => g.id === selectedInGameGuildId)?.adminRoleId && inGameGuilds.find(g => g.id === selectedInGameGuildId)!.adminRoleId!.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {inGameGuilds.find(g => g.id === selectedInGameGuildId)!.adminRoleId!.map(roleId => {
                      const role = discordData?.roles.find(r => r.id === roleId)
                      return role ? (
                        <span key={roleId} className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs rounded">
                          {role.name}
                          <button
                            onClick={() => {
                              const currentGuild = inGameGuilds.find(g => g.id === selectedInGameGuildId)
                              const newRoleIds = currentGuild?.adminRoleId?.filter(id => id !== roleId) || []
                              setInGameGuilds(prev =>
                                prev.map(g => g.id === selectedInGameGuildId ? { ...g, adminRoleId: newRoleIds } : g)
                              )
                            }}
                            className="ml-1 hover:text-red-600 dark:hover:text-red-200"
                          >
                            ×
                          </button>
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>



              {/* Delete All Resources (Discord Server Owners Only) */}
              {selectedInGameGuildId && discordServers.find(s => s.id === selectedDiscordServerId)?.isOwner && (
                <div className="pt-4 border-t border-guildgamesh-300 dark:border-primary-700/30">
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
                    ⚠️ Danger Zone
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Delete all resources for <strong>{inGameGuilds.find(g => g.id === selectedInGameGuildId)?.title || 'this guild'}</strong>. 
                    This action is <strong>irreversible</strong> and will remove all resources, history, and leaderboard data for this guild only.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={deletingResources}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm rounded-lg font-medium transition-colors"
                    >
                      🗑️ Delete All Resources for This Guild
                    </button>

                    <button
                      onClick={() => setShowResetConfirm(true)}
                      disabled={resettingResources}
                      className="px-4 py-2 bg-gray-900 hover:bg-black disabled:bg-gray-600 text-white text-sm rounded-lg font-medium transition-colors border border-gray-700"
                    >
                      🔄 Reset to Default Resources
                    </button>

                    <button
                      onClick={() => setShowDeleteGuildConfirm(true)}
                      disabled={deletingGuild}
                      className="px-4 py-2 bg-red-800 hover:bg-red-900 disabled:bg-red-500 text-white text-sm rounded-lg font-medium transition-colors border-2 border-red-600"
                    >
                      💥 Delete Entire Guild
                    </button>
                  </div>

                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-xs text-red-800 dark:text-red-200">
                      <strong>⚠️ Discord Server Owner Only:</strong> This button is only visible to Discord server owners. 
                      It will delete all resources for the selected in-game guild. Other guilds on this Discord server will not be affected.
                    </p>
                  </div>
                </div>
              )}

              {/* Delete Confirmation Modal */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-guildgamesh-100 dark:bg-stone-800 rounded-lg border border-guildgamesh-300 dark:border-primary-700/40 shadow-xl max-w-md w-full p-6">
                    <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
                      ⚠️ Confirm Deletion
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      Are you absolutely sure you want to delete <strong>ALL resources</strong> for <strong>{inGameGuilds.find(g => g.id === selectedInGameGuildId)?.title}</strong>?
                    </p>
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 mb-4">
                      <p className="text-sm text-red-800 dark:text-red-200">
                        <strong>This will permanently delete:</strong>
                      </p>
                      <ul className="text-sm text-red-800 dark:text-red-200 list-disc list-inside mt-2">
                        <li>All resources for this guild</li>
                        <li>All resource history entries</li>
                        <li>All leaderboard points for this guild</li>
                      </ul>
                      <p className="text-sm text-red-800 dark:text-red-200 mt-2">
                        <strong>This action cannot be undone!</strong>
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDeleteAllResources}
                        disabled={deletingResources}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
                      >
                        {deletingResources ? 'Deleting...' : 'Yes, Delete Everything'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={deletingResources}
                        className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Guild Confirmation Modal */}
              {showDeleteGuildConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-guildgamesh-100 dark:bg-stone-800 rounded-lg border border-guildgamesh-300 dark:border-primary-700/40 shadow-xl max-w-md w-full p-6">
                    <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
                      💥 Confirm Guild Deletion
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      Are you absolutely sure you want to <strong>PERMANENTLY DELETE</strong> the entire guild <strong>{inGameGuilds.find(g => g.id === selectedInGameGuildId)?.title}</strong>?
                    </p>
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 mb-4">
                      <p className="text-sm text-red-800 dark:text-red-200 font-bold mb-2">
                        ⚠️ THIS WILL PERMANENTLY DELETE:
                      </p>
                      <ul className="text-sm text-red-800 dark:text-red-200 list-disc list-inside space-y-1">
                        <li>The guild itself</li>
                        <li>All resources for this guild</li>
                        <li>All resource history entries</li>
                        <li>All leaderboard points</li>
                        <li>All Discord orders</li>
                        <li>All bot activity logs</li>
                        <li>All Discord embeds</li>
                        <li>All configuration data</li>
                      </ul>
                      <p className="text-sm text-red-800 dark:text-red-200 mt-3 font-bold">
                        🚨 THIS ACTION CANNOT BE UNDONE! 🚨
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDeleteGuild}
                        disabled={deletingGuild}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
                      >
                        {deletingGuild ? 'Deleting Guild...' : 'Yes, Delete Entire Guild'}
                      </button>
                      <button
                        onClick={() => setShowDeleteGuildConfirm(false)}
                        disabled={deletingGuild}
                        className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Reset to Defaults Confirmation Modal */}
              {showResetConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-guildgamesh-100 dark:bg-stone-800 rounded-lg border border-guildgamesh-300 dark:border-primary-700/40 shadow-xl max-w-md w-full p-6">
                    <h3 className="text-xl font-bold text-primary-600 dark:text-primary-400 mb-4">
                      🔄 Confirm Reset to Defaults
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      Are you sure you want to reset <strong>{inGameGuilds.find(g => g.id === selectedInGameGuildId)?.title}</strong> to default resources?
                    </p>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 mb-4">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 font-bold mb-2">
                        ⚠️ THIS WILL:
                      </p>
                      <ul className="text-sm text-yellow-800 dark:text-yellow-200 list-disc list-inside space-y-1">
                        <li>Delete all current resources</li>
                        <li>Delete all resource history entries</li>
                        <li>Delete all leaderboard points</li>
                        <li>Create 95 default resources (all at quantity 0)</li>
                      </ul>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-3 font-bold">
                        ✅ The guild itself will remain intact
                      </p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-2">
                        <strong>This action cannot be undone!</strong>
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleResetToDefaults}
                        disabled={resettingResources}
                        className="flex-1 px-4 py-2 bg-gray-900 hover:bg-black disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                      >
                        {resettingResources ? 'Resetting...' : 'Yes, Reset to Defaults'}
                      </button>
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        disabled={resettingResources}
                        className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="pt-4 border-t border-guildgamesh-300 dark:border-primary-700/30">
                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg font-medium transition-colors"
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
          <div className="bg-guildgamesh-100 dark:bg-stone-800 rounded-lg border border-guildgamesh-300 dark:border-primary-700/40 shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Activity Log
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Last 100 events
              </span>
            </div>

            {loadingLogs ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  No activity logs yet
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Activity will appear here when users interact with the bot
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activityLogs.map((log) => {
                  const getEventIcon = (eventType: string) => {
                    switch (eventType) {
                      case 'order_created':
                        return (
                          <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )
                      case 'order_filled':
                        return (
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )
                      case 'order_cancelled':
                        return (
                          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )
                      case 'stock_updated':
                        return (
                          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                          </svg>
                        )
                      case 'embed_updated':
                        return (
                          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )
                      case 'config_changed':
                        return (
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )
                      default:
                        return (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )
                    }
                  }

                  const getEventLabel = (eventType: string) => {
                    const labels: Record<string, string> = {
                      order_created: 'Order Created',
                      order_filled: 'Order Filled',
                      order_cancelled: 'Order Cancelled',
                      stock_updated: 'Stock Updated',
                      embed_updated: 'Embed Updated',
                      config_changed: 'Config Changed'
                    }
                    return labels[eventType] || eventType
                  }

                  const formatTimestamp = (date: Date) => {
                    const now = new Date()
                    const timestamp = new Date(date)
                    const diffMs = now.getTime() - timestamp.getTime()
                    const diffMins = Math.floor(diffMs / 60000)
                    const diffHours = Math.floor(diffMs / 3600000)
                    const diffDays = Math.floor(diffMs / 86400000)

                    if (diffMins < 1) return 'Just now'
                    if (diffMins < 60) return `${diffMins}m ago`
                    if (diffHours < 24) return `${diffHours}h ago`
                    if (diffDays < 7) return `${diffDays}d ago`
                    return timestamp.toLocaleDateString()
                  }

                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-guildgamesh-100 dark:bg-stone-800/50 hover:bg-guildgamesh-200 dark:hover:bg-stone-700 transition-colors"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getEventIcon(log.eventType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {getEventLabel(log.eventType)}
                            </p>
                            {log.resourceName && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                {log.resourceName}
                                {log.quantity !== null && ` (${log.quantity > 0 ? '+' : ''}${log.quantity.toLocaleString()})`}
                              </p>
                            )}
                            {log.username && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                by {log.username}
                              </p>
                            )}
                            {log.pointsAwarded !== null && log.pointsAwarded > 0 && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                +{log.pointsAwarded.toFixed(1)} points awarded
                              </p>
                            )}
                          </div>
                          <time className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">
                            {formatTimestamp(log.createdAt)}
                          </time>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Documentation Modal */}
      {showDocumentation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-guildgamesh-100 dark:bg-stone-800 rounded-lg border border-guildgamesh-300 dark:border-primary-700/40 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-guildgamesh-300 dark:border-primary-700/30">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Documentation
              </h2>
              <button
                onClick={() => setShowDocumentation(false)}
                className="p-2 hover:bg-guildgamesh-200 dark:hover:bg-stone-700 rounded-lg transition-colors"
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
                  
                  <div className="bg-guildgamesh-100 dark:bg-stone-900/20 border border-guildgamesh-300 dark:border-primary-800 rounded-lg p-4 mb-4">
                    <p className="text-sm text-primary-800 dark:text-primary-200">
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
                        When enabled, the bot sends notifications to the guild's order channel when resources are updated via the website. Useful for keeping the community informed.
                      </p>
                    </div>
                  </div>

                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mt-6 mb-2">Workflow for Server Owners</h4>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                    <li>Select your Discord server from the dropdown (bot must be installed)</li>
                    <li>Link it to an in-game guild (the database that stores resources)</li>
                    <li>Choose order channels where members can request resources</li>
                    <li>Select admin roles that can manage the bot configuration</li>
                    <li>Set the resource update bonus percentage (0-200%)</li>
                    <li>Configure notification preferences with the two toggles</li>
                    <li>Click <strong>Save Configuration</strong></li>
                  </ol>

                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mt-6 mb-2">Multi-Guild Best Practices</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                    <li>Each in-game guild belongs to exactly ONE Discord server</li>
                    <li>One Discord server can manage multiple in-game guilds</li>
                    <li>Each guild has separate resources, leaderboards, and activity logs</li>
                    <li>Bot configuration is per-guild (each guild can have different settings)</li>
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
                        Ensure "Auto-Update Discord Embeds" is enabled. Check that the bot has permissions to post in the guild's order channel. Verify the channel IDs are correct.
                      </p>
                    </div>
                  </div>
                </section>

                <div className="border-t border-guildgamesh-300 dark:border-primary-700/30 pt-6 mt-6">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Need More Help?</h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    For additional help, feature requests, or bug reports, contact your server administrator or check the main dashboard for system announcements.
                  </p>
                  <a 
                    href="/bot-configuration-guide.txt"
                    download="Resource-Tracker-Bot-Configuration-Guide.txt"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Full Documentation
                  </a>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-guildgamesh-300 dark:border-primary-700/30 flex justify-end">
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


