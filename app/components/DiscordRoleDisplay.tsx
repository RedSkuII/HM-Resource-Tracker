'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface RoleDisplayProps {
  roleId: string
}

export function DiscordRoleDisplay({ roleId }: RoleDisplayProps) {
  const [roleName, setRoleName] = useState<string>(`Loading...`)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRoleName = async () => {
      try {
        const response = await fetch('/api/discord/roles')
        if (response.ok) {
          const data = await response.json()
          const name = data.roleNames[roleId] || `Unknown Role (${roleId})`
          setRoleName(name)
        } else {
          setRoleName(`Unknown Role (${roleId})`)
        }
      } catch (error) {
        console.error('Failed to fetch role name:', error)
        setRoleName(`Unknown Role (${roleId})`)
      } finally {
        setLoading(false)
      }
    }

    fetchRoleName()
  }, [roleId])

  return (
    <div className="flex flex-col">
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {loading ? (
          <span className="animate-pulse">Loading role...</span>
        ) : (
          roleName
        )}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400">ID: {roleId}</span>
    </div>
  )
}

interface RolesSectionProps {
  roles: string[]
}

export function DiscordRolesSection({ roles }: RolesSectionProps) {
  const [roleNames, setRoleNames] = useState<{ [roleId: string]: string }>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAllRoleNames = async () => {
      try {
        const response = await fetch('/api/discord/roles')
        if (response.ok) {
          const data = await response.json()
          setRoleNames(data.roleNames)
        } else {
          // Fallback to showing role IDs
          const fallbackNames: { [roleId: string]: string } = {}
          roles.forEach(roleId => {
            fallbackNames[roleId] = `Unknown Role (${roleId})`
          })
          setRoleNames(fallbackNames)
        }
      } catch (error) {
        console.error('Failed to fetch role names:', error)
        const fallbackNames: { [roleId: string]: string } = {}
        roles.forEach(roleId => {
          fallbackNames[roleId] = `Unknown Role (${roleId})`
        })
        setRoleNames(fallbackNames)
      } finally {
        setLoading(false)
      }
    }

    if (roles.length > 0) {
      fetchAllRoleNames()
    } else {
      setLoading(false)
    }
  }, [roles])

  if (loading) {
    return (
      <div className="space-y-2">
        {roles.map((roleId) => (
          <div key={roleId} className="flex items-center justify-between animate-pulse">
            <div className="flex flex-col">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-1"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
            </div>
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
              Discord Role
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {roles.length > 0 ? (
        roles.map((roleId: string) => {
          const roleName = roleNames[roleId] || `Unknown Role (${roleId})`
          return (
            <div key={roleId} className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{roleName}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">ID: {roleId}</span>
              </div>
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                Discord Role
              </span>
            </div>
          )
        })
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400">No roles found</p>
      )}
    </div>
  )
}