'use client'

import { useEffect, useState } from 'react'

interface BotStats {
  orders: {
    totalOrders: number
    pendingOrders: number
    filledOrders: number
    cancelledOrders: number
  }
  activity: {
    totalEvents: number
    totalPointsAwarded: number
    uniqueUsers: number
  }
  eventBreakdown: Array<{
    eventType: string
    count: number
    totalPoints: number
  }>
  topContributors: Array<{
    userId: string
    username: string
    totalPoints: number
    actionCount: number
  }>
  dailyTrend: Array<{
    date: string
    events: number
    points: number
  }>
  timeFilter: string
}

interface BotStatsCardsProps {
  guildId: string
}

export function BotStatsCards({ guildId }: BotStatsCardsProps) {
  const [stats, setStats] = useState<BotStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('7d')

  useEffect(() => {
    const fetchStats = async () => {
      if (!guildId) return

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/bot/stats/${guildId}?timeFilter=${timeFilter}`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || 'Failed to fetch statistics')
        }

        const data = await response.json()
        setStats(data)
      } catch (err) {
        console.error('[BOT-STATS] Error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [guildId, timeFilter])

  if (loading) {
    return (
      <div className="bg-guildgamesh-100 dark:bg-stone-800 rounded-lg shadow-lg border border-sand-200 dark:border-primary-700/40-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    )
  }

  if (!stats) return null

  const fillRate = stats.orders.totalOrders > 0
    ? ((stats.orders.filledOrders / stats.orders.totalOrders) * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-6">
      {/* Time Filter */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          📊 Bot Statistics
        </h2>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as any)}
          className="px-4 py-2 border border-sand-200 dark:border-primary-700/40 rounded-lg bg-guildgamesh-100 dark:bg-stone-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div className="bg-guildgamesh-100 dark:bg-stone-800 rounded-lg shadow-lg border border-sand-200 dark:border-primary-700/40 p-6 border border-sand-200 dark:border-primary-700/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.orders.totalOrders}
              </p>
            </div>
            <div className="text-4xl">📋</div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 dark:text-green-400 font-medium">
              {stats.orders.pendingOrders} pending
            </span>
          </div>
        </div>

        {/* Filled Orders */}
        <div className="bg-guildgamesh-100 dark:bg-stone-800 rounded-lg shadow-lg border border-sand-200 dark:border-primary-700/40 p-6 border border-sand-200 dark:border-primary-700/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Filled Orders</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.orders.filledOrders}
              </p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-primary-600 dark:text-primary-400 font-medium">
              {fillRate}% fill rate
            </span>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-guildgamesh-100 dark:bg-stone-800 rounded-lg shadow-lg border border-sand-200 dark:border-primary-700/40 p-6 border border-sand-200 dark:border-primary-700/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.activity.uniqueUsers}
              </p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-purple-600 dark:text-purple-400 font-medium">
              {stats.activity.totalEvents} actions
            </span>
          </div>
        </div>

        {/* Points Awarded */}
        <div className="bg-guildgamesh-100 dark:bg-stone-800 rounded-lg shadow-lg border border-sand-200 dark:border-primary-700/40 p-6 border border-sand-200 dark:border-primary-700/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Points Awarded</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {Math.round(stats.activity.totalPointsAwarded).toLocaleString()}
              </p>
            </div>
            <div className="text-4xl">⭐</div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-yellow-600 dark:text-yellow-400 font-medium">
              {stats.activity.uniqueUsers > 0 
                ? Math.round(stats.activity.totalPointsAwarded / stats.activity.uniqueUsers)
                : 0} avg/user
            </span>
          </div>
        </div>
      </div>

      {/* Event Breakdown & Top Contributors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Breakdown */}
        <div className="bg-guildgamesh-100 dark:bg-stone-800 rounded-lg shadow-lg border border-sand-200 dark:border-primary-700/40 p-6 border border-sand-200 dark:border-primary-700/30">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Activity Breakdown
          </h3>
          <div className="space-y-3">
            {stats.eventBreakdown.length > 0 ? (
              stats.eventBreakdown.map((event) => (
                <div key={event.eventType} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">
                      {event.eventType === 'order_filled' && '✅'}
                      {event.eventType === 'order_created' && '📝'}
                      {event.eventType === 'order_cancelled' && '❌'}
                      {event.eventType === 'stock_updated' && '📦'}
                      {!['order_filled', 'order_created', 'order_cancelled', 'stock_updated'].includes(event.eventType) && '📊'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {event.eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {event.count} events • {Math.round(event.totalPoints)} points
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                No activity recorded yet
              </p>
            )}
          </div>
        </div>

        {/* Top Contributors */}
        <div className="bg-guildgamesh-100 dark:bg-stone-800 rounded-lg shadow-lg border border-sand-200 dark:border-primary-700/40 p-6 border border-sand-200 dark:border-primary-700/30">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🏆 Top Contributors
          </h3>
          <div className="space-y-3">
            {stats.topContributors.length > 0 ? (
              stats.topContributors.map((contributor, index) => (
                <div key={contributor.userId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && `${index + 1}.`}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {contributor.username || `User ${contributor.userId}`}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {contributor.actionCount} actions
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                    {Math.round(contributor.totalPoints)} pts
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                No contributors yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Daily Trend Chart */}
      {stats.dailyTrend.length > 0 && (
        <div className="bg-guildgamesh-100 dark:bg-stone-800 rounded-lg shadow-lg border border-sand-200 dark:border-primary-700/40 p-6 border border-sand-200 dark:border-primary-700/30">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            📈 Activity Trend (Last 7 Days)
          </h3>
          <div className="space-y-2">
            {stats.dailyTrend.map((day) => {
              const maxEvents = Math.max(...stats.dailyTrend.map(d => d.events))
              const barWidth = maxEvents > 0 ? (day.events / maxEvents) * 100 : 0
              
              return (
                <div key={day.date} className="flex items-center space-x-3">
                  <span className="text-xs text-gray-600 dark:text-gray-400 w-24">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-primary-500 dark:bg-primary-400 h-full rounded-full flex items-center justify-end px-2"
                      style={{ width: `${Math.max(barWidth, 5)}%` }}
                    >
                      <span className="text-xs text-white font-medium">
                        {day.events}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 w-16 text-right">
                    {Math.round(day.points)} pts
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
