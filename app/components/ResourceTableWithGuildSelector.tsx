'use client'

import { useState } from 'react'
import GuildSelector from './GuildSelector'
import { ResourceTable } from './ResourceTable'

interface ResourceTableWithGuildSelectorProps {
  userId: string
}

export function ResourceTableWithGuildSelector({ userId }: ResourceTableWithGuildSelectorProps) {
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null)

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
          <p className="text-gray-500 dark:text-gray-400">
            Select a guild to view resources
          </p>
        </div>
      )}
    </div>
  )
}
