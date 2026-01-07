'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface Guild {
  id: string
  title: string
  maxMembers: number
  leaderId: string | null
}

interface GuildSelectorProps {
  selectedGuildId: string | null
  onGuildChange: (guildId: string) => void
  hasLoadedFromStorage?: boolean
  showAllOption?: boolean  // Whether to show "All Guilds" option
  allOptionLabel?: string  // Custom label for "All Guilds" option
}

export default function GuildSelector({ 
  selectedGuildId, 
  onGuildChange, 
  hasLoadedFromStorage = false,
  showAllOption = false,
  allOptionLabel = 'All My Guilds'
}: GuildSelectorProps) {
  const { data: session, status } = useSession()
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [loading, setLoading] = useState(true)
  const [hasAutoSelected, setHasAutoSelected] = useState(false)

  useEffect(() => {
    // Only fetch guilds when session is ready
    if (status === 'authenticated') {
      console.log('[GuildSelector] Session authenticated, fetching guilds...')
      fetchGuilds()
    } else if (status === 'loading') {
      console.log('[GuildSelector] Waiting for session to load...')
    } else {
      console.log('[GuildSelector] Session status:', status)
    }
  }, [status])

  // Auto-select first guild when both conditions are met (only once)
  useEffect(() => {
    // Validate that selectedGuildId exists in the guilds list
    const selectedGuildExists = selectedGuildId && guilds.some(g => g.id === selectedGuildId)
    
    if (!selectedGuildExists && hasLoadedFromStorage && guilds.length > 0 && !loading && !hasAutoSelected) {
      console.log('Auto-selecting guild after both loaded:', guilds[0].id)
      setHasAutoSelected(true)
      onGuildChange(guilds[0].id)
    }
  }, [selectedGuildId, hasLoadedFromStorage, guilds, loading, hasAutoSelected, onGuildChange])

  const fetchGuilds = async () => {
    try {
      const response = await fetch('/api/guilds', {
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      if (response.ok) {
        const responseData = await response.json()
        // Handle both { guilds: [...] } and raw array formats
        const data = responseData.guilds || responseData
        console.log('Guilds fetched:', data)
        
        // Only update guilds if we got data, otherwise keep existing guilds
        if (data && data.length > 0) {
          setGuilds(data)
        } else if (guilds.length === 0) {
          // If we got empty and have no cached guilds, retry once after a delay
          console.warn('Guilds API returned empty on first try, retrying in 1 second...')
          setTimeout(() => {
            fetchGuilds()
          }, 1000)
        } else {
          console.warn('Guilds API returned empty, keeping cached guilds')
        }
      } else {
        console.error('Failed to fetch guilds:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching guilds:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent"></div>
        Loading guilds...
      </div>
    )
  }

  if (guilds.length === 0) {
    return (
      <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">No Guilds Available</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You don't have access to any in-game guilds. Please contact your Discord server administrator to set up guild tracking.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // If user only has one guild and showAllOption is false, just display the guild name (no dropdown needed)
  if (guilds.length === 1 && !showAllOption) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-300">In-Game Guild:</span>
        <span className="px-4 py-2 rounded-lg bg-gray-700 text-white font-medium">
          {guilds[0].title}
        </span>
      </div>
    )
  }

  // Show "All Guilds" option only if user has multiple guilds
  const shouldShowAllOption = showAllOption && guilds.length > 1
  
  console.log('[GuildSelector] Rendering dropdown:', { 
    guildsCount: guilds.length, 
    showAllOption, 
    shouldShowAllOption,
    selectedGuildId 
  })

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="guild-selector" className="text-sm font-medium text-gray-300">
        {guilds.length > 1 ? 'Guild:' : 'In-Game Guild:'}
      </label>
      <select
        id="guild-selector"
        value={selectedGuildId === 'all' ? 'all' : (selectedGuildId && guilds.some(g => g.id === selectedGuildId) ? selectedGuildId : (guilds[0]?.id || ''))}
        onChange={(e) => onGuildChange(e.target.value)}
        className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[180px]"
      >
        {shouldShowAllOption && (
          <option value="all">{allOptionLabel}</option>
        )}
        {guilds.map((guild) => (
          <option key={guild.id} value={guild.id}>
            {guild.title}
          </option>
        ))}
      </select>
    </div>
  )
}
