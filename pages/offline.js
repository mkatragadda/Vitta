import { useState, useEffect } from 'react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)
  const [timeWaiting, setTimeWaiting] = useState(0)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      // Redirect back to app when online
      setTimeout(() => {
        window.location.href = '/'
      }, 1500)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setTimeWaiting(0)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Timer for how long user has been offline
    const timer = setInterval(() => {
      if (!isOnline) {
        setTimeWaiting((prev) => prev + 1)
      }
    }, 1000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(timer)
    }
  }, [isOnline])

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m`
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500 p-4">
      <div className="text-center px-6 py-12 bg-white rounded-lg shadow-2xl max-w-md w-full transform transition-all">
        <div className="mb-6">
          <div className="inline-block p-4 bg-purple-100 rounded-full mb-4">
            <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.111 16H5m11 0h3m-11-8h.01M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z"
              />
            </svg>
          </div>
          {isOnline && (
            <div className="inline-block animate-bounce">
              <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {isOnline ? "You're Back Online!" : 'You\'re Offline'}
        </h1>

        <p className="text-gray-600 mb-6">
          {isOnline
            ? 'Redirecting you back to the app...'
            : "It looks like you've lost your internet connection. Your changes will be saved automatically when you're back online."}
        </p>

        {!isOnline && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-blue-800 font-semibold mb-3">What you can do:</p>
            <ul className="text-sm text-blue-700 space-y-2">
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                View your saved cards and chat history
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                Compose messages (they&apos;ll send when online)
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                Review payment recommendations
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                Check your spending insights
              </li>
            </ul>
          </div>
        )}

        {isOnline ? (
          <div className="space-y-2">
            <div className="inline-block">
              <svg className="w-5 h-5 text-green-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-600">Syncing your changes...</p>
          </div>
        ) : (
          <>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors mb-3"
            >
              Try Again
            </button>

            <p className="text-xs text-gray-500">
              Waiting for connection... {timeWaiting > 0 && `(${formatTime(timeWaiting)})`}
            </p>
          </>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-3">💡 Pro Tips</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>Your work is automatically saved</li>
            <li>No data loss when you reconnect</li>
            <li>Message queue syncs automatically</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
