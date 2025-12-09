'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { LoginButton } from './LoginButton'
import { LogoutButton } from './LogoutButton'
import { ThemeToggle } from './ThemeToggle'
import { VersionDisplay } from './VersionDisplay'
import { WhatsNewModal } from './WhatsNewModal'
import { useState } from 'react'

interface ClientNavigationProps {
  title: string
  showDashboardLink?: boolean
}

export function ClientNavigation({ title, showDashboardLink = true }: ClientNavigationProps) {
  const { data: session } = useSession()
  const [showChangelog, setShowChangelog] = useState(false)

  return (
    <>
      <nav className="bg-white dark:bg-gradient-to-r dark:from-stone-900 dark:to-gray-900 shadow-md border-b border-sand-200 dark:border-primary-800/40 transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Title and Version */}
            <div className="flex items-center gap-3">
              <Link href="/" className="text-xl font-bold text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-500 transition-colors">
                {title}
              </Link>
              <VersionDisplay onClick={() => setShowChangelog(true)} />
            </div>

            {/* Right side - Navigation and Auth */}
            <div className="flex items-center gap-4">
              {session && showDashboardLink && (
                <Link
                  href="/dashboard"
                  className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-500 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
              )}
              
              <ThemeToggle />
              
              {session ? <LogoutButton /> : <LoginButton />}
            </div>
          </div>
        </div>
      </nav>

      {/* Changelog Modal */}
      {showChangelog && (
        <WhatsNewModal 
          isOpen={showChangelog}
          onClose={() => setShowChangelog(false)}
          forceShow={true}
        />
      )}
    </>
  )
} 