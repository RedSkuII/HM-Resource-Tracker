'use client'

import { useState, useEffect } from 'react'

interface Guild {
  id: string
  title: string
  maxMembers: number
  leaderId: string | null
}

interface GuildSelectorProps {
  selectedGuildId: string | null
  onGuildChange: (guildId: string) => void
}

export default function GuildSelector({ selectedGuildId, onGuildChange }: GuildSelectorProps) {
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGuilds()
  }, [])

  const fetchGuilds = async () => {
    try {
      const response = await fetch('/api/guilds', {
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      if (response.ok) {
        const data = await response.json()
        console.log('Guilds fetched:', data)
        setGuilds(data)
        
        // Auto-select first guild if none selected
        if (!selectedGuildId && data.length > 0) {
          console.log('Auto-selecting guild:', data[0].id)
          onGuildChange(data[0].id)
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
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent"></div>
        Loading guilds...
      </div>
    )
  }

  if (guilds.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="guild-selector" className="text-sm font-medium text-gray-300">
        In-Game Guild:
      </label>
      <select
        id="guild-selector"
        value={selectedGuildId || ''}
        onChange={(e) => onGuildChange(e.target.value)}
        className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        {guilds.map((guild) => (
          <option key={guild.id} value={guild.id}>
            {guild.title}
          </option>
        ))}
      </select>
    </div>
  )
}
