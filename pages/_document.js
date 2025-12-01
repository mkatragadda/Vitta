// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* CRITICAL: Clear service workers IMMEDIATELY in development - must be first */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (typeof window === 'undefined') return;
                  var hostname = window.location && window.location.hostname;
                  if (!hostname) return;
                  var isDev = hostname === 'localhost' || 
                             hostname === '127.0.0.1' ||
                             hostname.indexOf('localhost') !== -1;
                  if (isDev && 'serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(regs) {
                      if (regs && regs.length > 0) {
                        regs.forEach(function(reg) { 
                          if (reg && reg.unregister) reg.unregister(); 
                        });
                      }
                    }).catch(function(e) { console.warn('SW unregister error:', e); });
                    if ('caches' in window) {
                      caches.keys().then(function(names) {
                        if (names && names.length > 0) {
                          names.forEach(function(name) { 
                            if (name) caches.delete(name).catch(function(e) {}); 
                          });
                        }
                      }).catch(function(e) {});
                    }
                  }
                } catch(e) {
                  console.warn('SW cleanup error:', e);
                }
              })();
            `,
          }}
        />
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
        <meta name="apple-mobile-web-app-title" content="Vitta" />

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