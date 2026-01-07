'use client'
// Guildgamesh sand theme site-wide (updated Dec 12 2025 - cache bust v4)

import { useState, useEffect } from 'react'
import GuildSelector from './GuildSelector'
import { ResourceTable } from './ResourceTable'

interface ResourceTableWithGuildSelectorProps {
  userId: string
}

export function ResourceTableWithGuildSelector({ userId }: ResourceTableWithGuildSelectorProps) {
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false)

  // Load the last selected guild from localStorage on mount
  useEffect(() => {
    const lastSelectedGuild = localStorage.getItem('lastSelectedGuildId')
    console.log('[ResourceTableWithGuildSelector] Loading from localStorage:', lastSelectedGuild)
    if (lastSelectedGuild) {
      console.log('[ResourceTableWithGuildSelector] Setting guild from localStorage:', lastSelectedGuild)
      setSelectedGuildId(lastSelectedGuild)
    }
    setHasLoadedFromStorage(true)
  }, [])

  // Save selected guild to localStorage whenever it changes (but not 'all')
  useEffect(() => {
    if (selectedGuildId && selectedGuildId !== 'all') {
      console.log('[ResourceTableWithGuildSelector] Saving to localStorage:', selectedGuildId)
      localStorage.setItem('lastSelectedGuildId', selectedGuildId)
    }
    if (selectedGuildId && !isInitialized) {
      console.log('[ResourceTableWithGuildSelector] Guild initialized:', selectedGuildId)
      setIsInitialized(true)
    }
  }, [selectedGuildId, isInitialized])

  // Get display text based on selection
  const getDisplayText = () => {
    if (selectedGuildId === 'all') {
      return 'Viewing resources from all your guilds'
    }
    return 'Viewing resources for selected guild'
  }

  return (
    <div className="space-y-6">
      {/* Guild Selector */}
      <div className="flex items-center justify-between rounded-lg border border-sand-200 dark:border-primary-700/40 bg-guildgamesh-100 dark:bg-stone-800 p-4 shadow-sm">
        <GuildSelector 
          selectedGuildId={selectedGuildId} 
          onGuildChange={setSelectedGuildId}
          hasLoadedFromStorage={hasLoadedFromStorage}
          showAllOption={true}
          allOptionLabel="All Guilds"
        />
        {selectedGuildId && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {getDisplayText()}
          </div>
        )}
      </div>

      {/* Resource Table */}
      {selectedGuildId ? (
        <ResourceTable userId={userId} guildId={selectedGuildId === 'all' ? null : selectedGuildId} showGuildColumn={selectedGuildId === 'all'} />
      ) : (
        <div className="rounded-lg border border-sand-200 dark:border-primary-700/40 bg-guildgamesh-100 dark:bg-stone-800 p-8 text-center">
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
