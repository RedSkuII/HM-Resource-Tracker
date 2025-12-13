// Guildgamesh sand theme site-wide (updated Dec 13 2025 - cache bust v5)
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from './components/SessionProvider'
import { ThemeProvider } from './components/ThemeProvider'
import { WhatsNewModal } from './components/WhatsNewModal'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Guildgamesh - Resource Tracker',
  description: 'Resource management and Discord integration portal for gaming guilds',
  icons: {
    icon: '/favicon.ico',
  },
  other: {
    'version': 'v4-theme-update-' + Date.now(),
  },
}

// Force dynamic rendering to prevent static optimization caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <SessionProvider>
            {children}
            <WhatsNewModal />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
} 