'use client'

import { useState, useEffect } from 'react'
import GuildSelector from './GuildSelector'
import { ResourceTable } from './ResourceTable'

interface ResourceTableWithGuildSelectorProps {
  userId: string
}

export function ResourceTableWithGuildSelector({ userId }: ResourceTableWithGuildSelectorProps) {
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load the last selected guild from localStorage on mount
  useEffect(() => {
    const lastSelectedGuild = localStorage.getItem('lastSelectedGuildId')
    if (lastSelectedGuild) {
      setSelectedGuildId(lastSelectedGuild)
    }
  }, [])

  // Save selected guild to localStorage whenever it changes
  useEffect(() => {
    if (selectedGuildId) {
      localStorage.setItem('lastSelectedGuildId', selectedGuildId)
      if (!isInitialized) {
        console.log('[ResourceTableWithGuildSelector] Guild initialized:', selectedGuildId)
        setIsInitialized(true)
      }
    }
  }, [selectedGuildId, isInitialized])

  return (
    <div className="space-y-6">
      {/* Guild Selector */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
        <GuildSelector 
          selectedGuildId={selectedGuildId} 
          onGuildChange={setSelectedGuildId} 
        />
        {selectedGuildId && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Viewing resources for selected guild
          </div>
        )}
      </div>

      {/* Resource Table */}
      {selectedGuildId ? (
        <ResourceTable userId={userId} guildId={selectedGuildId} />
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
            <p className="text-gray-500 dark:text-gray-400">
              Loading guilds...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
