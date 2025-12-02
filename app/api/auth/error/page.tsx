'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'OAuthCallbackError':
        // Check if it's a rate limit error from the URL params
        const errorDesc = searchParams.get('error_description') || ''
        if (errorDesc.includes('rate limit') || errorDesc.includes('too many')) {
          return {
            title: 'Too Many Login Attempts',
            message: 'Discord is temporarily blocking login requests due to too many attempts.',
            details: 'You have tried to log in too many times in a short period. This is a Discord rate limit, not a problem with your account.',
            action: 'Please wait 2-5 minutes before trying again. Clear your browser cookies and try in a private/incognito window.',
            warning: true
          }
        }
        return {
          title: 'Authentication Error',
          message: 'There was a problem with Discord authentication.',
          details: 'This might be due to denying permissions or a temporary issue.',
          action: 'Please try logging in again.',
          warning: false
        }
      case 'access_denied':
        return {
          title: 'Authorization Denied',
          message: 'You clicked "Cancel" or "Deny" when Discord asked for permissions.',
          details: 'This app needs to verify your Discord server membership and roles to work properly.',
          action: 'Please try logging in again and click "Authorize" when Discord asks for permissions.',
          warning: false
        }
      case 'OAuthCallback':
        return {
          title: 'Authentication Error',
          message: 'There was a problem with Discord authentication.',
          details: 'This might be due to denying permissions or a temporary issue.',
          action: 'Please try logging in again.',
          warning: false
        }
      default:
        return {
          title: 'Authentication Error',
          message: 'An error occurred during sign in.',
          details: errorCode || 'Unknown error',
          action: 'Please try again or contact support if the problem persists.',
          warning: false
        }
    }
  }

  const errorInfo = getErrorMessage(error)

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 dark:from-gray-900 dark:to-blue-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 dark:bg-gray-800/50 backdrop-blur-md rounded-lg p-8 border border-white/20 dark:border-gray-700">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
            <svg 
              className="w-8 h-8 text-red-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3l-6.732-11c-.77-.833-1.962-.833-2.732 0L3.268 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">{errorInfo.title}</h1>
          <p className="text-blue-200 dark:text-blue-300 mb-4">
            {errorInfo.message}
          </p>
        </div>

        <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-100 mb-2">
            <strong>Details:</strong> {errorInfo.details}
          </p>
          <p className="text-sm text-blue-100">
            <strong>Next step:</strong> {errorInfo.action}
          </p>
        </div>

        {errorInfo.warning && (
          <div className="bg-orange-500/10 border border-orange-400/30 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg 
                className="w-5 h-5 text-orange-400 mt-0.5 mr-2 flex-shrink-0" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <div className="text-sm text-orange-100">
                <p className="font-medium mb-2">What to do:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Wait 2-5 minutes for Discord's rate limit to reset</li>
                  <li>Clear your browser cookies for this site</li>
                  <li>Try logging in using an incognito/private window</li>
                  <li>Avoid clicking the login button multiple times</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {error === 'access_denied' && (
          <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg 
                className="w-5 h-5 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <div className="text-sm text-yellow-100">
                <p className="font-medium mb-2">Multiple Discord Accounts?</p>
                <p className="mb-2">
                  If you have multiple Discord accounts logged in, Discord might use the wrong account.
                </p>
                <p>
                  Try signing in using an <strong>incognito/private window</strong> or log out of other Discord accounts first.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-center"
          >
            Try Again
          </Link>
          
          <details className="text-xs text-gray-300 dark:text-gray-400">
            <summary className="cursor-pointer hover:text-white">Technical Details</summary>
            <pre className="mt-2 p-2 bg-black/30 rounded overflow-auto">
              Error Code: {error || 'None'}
            </pre>
          </details>
        </div>
      </div>
    </main>
  )
}
