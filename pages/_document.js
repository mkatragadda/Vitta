// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document'

Document.getInitialProps = async (ctx) => {
  // Server-side: Only inject dev flag in development
  const isDevelopment = process.env.NODE_ENV !== 'production'
  
  // Get default initial props from Next.js
  const initialProps = await ctx.defaultGetInitialProps(ctx)
  
  return {
    ...initialProps,
    isDevelopment
  }
}

export default function Document({ isDevelopment = false }) {
  return (
    <Html lang="en">
      <Head>
        {/* CRITICAL: Service worker cleanup ONLY in development with server-side safety check */}
        {isDevelopment && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    if (typeof window === 'undefined') return;
                    var hostname = window.location && window.location.hostname;
                    if (!hostname) return;
                    
                    // EXTREMELY RESTRICTIVE: Only exact matches for development
                    // This prevents any production domain from accidentally matching
                    var isLocalDev = hostname === 'localhost' || 
                                   hostname === '127.0.0.1' ||
                                   (hostname.indexOf('192.168.') === 0 && hostname.split('.').length === 4) || // Exact IP format: 192.168.x.x
                                   (hostname.indexOf('10.0.') === 0 && hostname.split('.').length === 4);     // Exact IP format: 10.0.x.x
                    
                    // DOUBLE CHECK: Must pass BOTH server-side flag AND client-side check
                    if (!isLocalDev) return; // Exit if hostname doesn't match
                    
                    // Additional safety: Check for production-like patterns and exit
                    var prodPatterns = ['.com', '.net', '.org', '.io', '.app', '.dev', 'vercel', 'heroku', 'netlify'];
                    if (prodPatterns.some(function(pattern) { return hostname.indexOf(pattern) !== -1; })) {
                      console.warn('[SW CLEANUP] Production-like domain detected, skipping cleanup');
                      return;
                    }
                  
                  // Check if service worker is controlling this page (critical for mobile)
                  var hadController = false;
                  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    hadController = true;
                    console.warn('[SW CLEANUP] Service worker is CONTROLLING this page - forcing cleanup and reload');
                  }
                  
                  // Aggressive cleanup: Unregister ALL service workers
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(regs) {
                      var unregistered = false;
                      if (regs && regs.length > 0) {
                        console.log('[SW CLEANUP] Found', regs.length, 'service worker(s) - unregistering...');
                        var unregisterPromises = [];
                        regs.forEach(function(reg) {
                          if (reg && typeof reg.unregister === 'function') {
                            unregistered = true;
                            unregisterPromises.push(
                              reg.unregister().then(function(success) {
                                if (success) {
                                  console.log('[SW CLEANUP] Unregistered:', reg.scope);
                                }
                                return success;
                              }).catch(function(e) {
                                console.warn('[SW CLEANUP] Unregister error:', e);
                                return false;
                              })
                            );
                          }
                        });
                        
                        // After unregistering, clear caches and reload if needed
                        Promise.all(unregisterPromises).then(function(results) {
                          // Clear ALL caches aggressively
                          if ('caches' in window) {
                            return caches.keys().then(function(cacheNames) {
                              if (cacheNames && cacheNames.length > 0) {
                                console.log('[SW CLEANUP] Clearing', cacheNames.length, 'cache(s)...');
                                var deletePromises = cacheNames.map(function(name) {
                                  return caches.delete(name).catch(function(e) {
                                    console.warn('[SW CLEANUP] Cache delete error:', name, e);
                                    return false;
                                  });
                                });
                                return Promise.all(deletePromises);
                              }
                            }).catch(function(e) {
                              console.warn('[SW CLEANUP] Cache keys error:', e);
                            });
                          }
                        }).then(function() {
                          // If service worker was controlling the page, force a hard reload
                          // This is critical for mobile browsers
                          // Use sessionStorage to prevent infinite reload loops
                          if (hadController) {
                            var reloadKey = 'sw_cleanup_reload';
                            if (!sessionStorage.getItem(reloadKey)) {
                              sessionStorage.setItem(reloadKey, '1');
                              console.log('[SW CLEANUP] Service worker was controlling page - forcing hard reload...');
                              // Use setTimeout to allow cleanup to complete
                              setTimeout(function() {
                                window.location.reload(true);
                              }, 200);
                            } else {
                              // Already reloaded once, clear the flag
                              sessionStorage.removeItem(reloadKey);
                            }
                          }
                        });
                      } else {
                        // Even if no registrations, clear caches
                        if ('caches' in window) {
                          caches.keys().then(function(cacheNames) {
                            if (cacheNames && cacheNames.length > 0) {
                              console.log('[SW CLEANUP] No registrations but clearing', cacheNames.length, 'cache(s)...');
                              cacheNames.forEach(function(name) {
                                caches.delete(name).catch(function() {});
                              });
                            }
                          });
                        }
                      }
                    }).catch(function(e) {
                      console.warn('[SW CLEANUP] Registration check error:', e);
                    });
                  } else {
                    // No serviceWorker support, but still clear caches
                    if ('caches' in window) {
                      caches.keys().then(function(cacheNames) {
                        if (cacheNames && cacheNames.length > 0) {
                          cacheNames.forEach(function(name) {
                            caches.delete(name).catch(function() {});
                          });
                        }
                      });
                    }
                  }
                } catch(e) {
                  console.error('[SW CLEANUP] Fatal error:', e);
                }
              })();
              `,
            }}
          />
        )}
        {/* Basic Meta Tags */}
        <meta charSet="utf-8" />
        <meta
          name="description"
          content="AI-powered credit card optimization and payment strategy assistant"
        />

        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#6366f1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Agentic Wallet" />

        {/* App Favicons */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Google Identity Services */}
        <script src="https://accounts.google.com/gsi/client" async defer></script>

        {/* Service Worker Registration - Script handles dev/prod internally */}
        <script async src="/register-sw.js"></script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}