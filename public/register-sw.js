/**
 * Service Worker Registration Script
 * This file is loaded synchronously in _document.js
 */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', {
        scope: '/',
      })
      .then((registration) => {
        console.log('[SW] Registration successful:', registration.scope)

        // Check for updates periodically
        setInterval(() => {
          registration.update()
        }, 60000) // Check every minute

        // Listen for new service worker ready
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          console.log('[SW] Update found')

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New service worker available
              console.log('[SW] New version available')

              // Send message to UI about new update
              window.dispatchEvent(
                new CustomEvent('swUpdateAvailable', {
                  detail: { registration },
                })
              )
            }
          })
        })
      })
      .catch((error) => {
        console.warn('[SW] Registration failed:', error)
      })

    // Handle messages from Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[SW] Message received:', event.data)

      if (event.data && event.data.type === 'SYNC_STARTED') {
        window.dispatchEvent(
          new CustomEvent('syncStarted', { detail: event.data })
        )
      }

      if (event.data && event.data.type === 'SYNC_COMPLETED') {
        window.dispatchEvent(
          new CustomEvent('syncCompleted', { detail: event.data })
        )
      }
    })
  })

  // Handle clicks on SW install button (future)
  let deferredPrompt

  window.addEventListener('beforeinstallprompt', (event) => {
    console.log('[SW] Install prompt available')
    event.preventDefault()
    deferredPrompt = event

    window.dispatchEvent(
      new CustomEvent('installPromptAvailable', { detail: deferredPrompt })
    )
  })

  window.addEventListener('appinstalled', () => {
    console.log('[SW] PWA was installed')
    deferredPrompt = null

    window.dispatchEvent(new CustomEvent('appInstalled'))
  })
}
