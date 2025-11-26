import '../styles/globals.css'
import Script from 'next/script'
import { useState, useEffect } from 'react'

export default function App({ Component, pageProps }) {
  const [isOnline, setIsOnline] = useState(true)
  const [syncStatus, setSyncStatus] = useState('idle') // idle, syncing, error
  const [storageReady, setStorageReady] = useState(false)

  // Initialize storage services on app load
  useEffect(() => {
    const initStorage = async () => {
      try {
        // Placeholder: Will be replaced with actual storage initialization in Phase 3
        // import { initializeStorageServices } from '../services/storage/storageManager'
        // await initializeStorageServices()
        setStorageReady(true)
        console.log('[App] Storage services initialized')
      } catch (error) {
        console.error('[App] Storage initialization failed:', error)
        // Continue anyway - app can work without offline support
        setStorageReady(true)
      }
    }

    initStorage()
  }, [])

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[App] Coming online')
      setIsOnline(true)
      setSyncStatus('syncing')

      // Trigger sync of pending operations
      // Placeholder: Will be replaced with actual sync logic in Phase 3
      // import syncManager from '../services/sync/syncManager'
      // syncManager.syncAll().finally(() => {
      //   setSyncStatus('idle')
      // })

      // For now, just mark sync as complete after a moment
      setTimeout(() => {
        setSyncStatus('idle')
      }, 1000)
    }

    const handleOffline = () => {
      console.log('[App] Going offline')
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Create offline context to pass to components
  const offlineContext = {
    isOnline,
    syncStatus,
    storageReady,
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />
      <Component {...pageProps} offlineContext={offlineContext} />
    </>
  )
}