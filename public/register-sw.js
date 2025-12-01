/**
 * Service Worker Registration Script
 * This file is loaded synchronously in _document.js
 * In development, it immediately unregisters all service workers
 */

(function() {
  'use strict';
  
  // Immediately check and unregister service workers in development
  // Check for any localhost/127.0.0.1 regardless of port
  const isDevelopment = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '' ||
    window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('127.0.0.1')
  );
  
  if (isDevelopment && 'serviceWorker' in navigator) {
    // Immediately unregister all service workers
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      if (registrations.length > 0) {
        console.log('[SW] Development mode: Unregistering', registrations.length, 'service worker(s)');
        registrations.forEach(function(registration) {
          registration.unregister().then(function(success) {
            if (success) {
              console.log('[SW] Successfully unregistered:', registration.scope);
            }
          });
        });
      }
    });
    
    // Clear all caches immediately
    if ('caches' in window) {
      caches.keys().then(function(cacheNames) {
        if (cacheNames.length > 0) {
          console.log('[SW] Development mode: Clearing', cacheNames.length, 'cache(s)');
          cacheNames.forEach(function(cacheName) {
            caches.delete(cacheName).then(function(success) {
              if (success) {
                console.log('[SW] Cleared cache:', cacheName);
              }
            });
          });
        }
      });
    }
    
    // Don't proceed with registration in development
    return;
  }
  
  // Production: Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker
        .register('/sw.js', {
          scope: '/',
        })
        .then(function(registration) {
          console.log('[SW] Registration successful:', registration.scope);

          // Check for updates periodically
          setInterval(function() {
            registration.update();
          }, 60000); // Check every minute

          // Listen for new service worker ready
          registration.addEventListener('updatefound', function() {
            var newWorker = registration.installing;
            console.log('[SW] Update found');

            newWorker.addEventListener('statechange', function() {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // New service worker available
                console.log('[SW] New version available');

                // Send message to UI about new update
                window.dispatchEvent(
                  new CustomEvent('swUpdateAvailable', {
                    detail: { registration: registration },
                  })
                );
              }
            });
          });
        })
        .catch(function(error) {
          console.warn('[SW] Registration failed:', error);
        });

      // Handle messages from Service Worker
      navigator.serviceWorker.addEventListener('message', function(event) {
        console.log('[SW] Message received:', event.data);

        if (event.data && event.data.type === 'SYNC_STARTED') {
          window.dispatchEvent(
            new CustomEvent('syncStarted', { detail: event.data })
          );
        }

        if (event.data && event.data.type === 'SYNC_COMPLETED') {
          window.dispatchEvent(
            new CustomEvent('syncCompleted', { detail: event.data })
          );
        }
      });
    });

    // Handle clicks on SW install button (future)
    var deferredPrompt;

    window.addEventListener('beforeinstallprompt', function(event) {
      console.log('[SW] Install prompt available');
      event.preventDefault();
      deferredPrompt = event;

      window.dispatchEvent(
        new CustomEvent('installPromptAvailable', { detail: deferredPrompt })
      );
    });

    window.addEventListener('appinstalled', function() {
      console.log('[SW] PWA was installed');
      deferredPrompt = null;

      window.dispatchEvent(new CustomEvent('appInstalled'));
    });
  }
})();
