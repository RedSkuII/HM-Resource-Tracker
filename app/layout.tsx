// Guildgamesh sand theme site-wide (updated Dec 12 2025 - cache bust v4)
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
}

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