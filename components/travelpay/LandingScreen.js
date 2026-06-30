import React from 'react';

const GoogleIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const TRUST_ITEMS = [
  'No stored balance — your money stays with your payment provider',
  'Use supported providers you already trust',
  'Works with UPI QR codes and UPI IDs',
];

export default function LandingScreen({ onGoogleSignIn }) {
  return (
    <div style={{
      background: '#071412',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      color: '#fff',
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>

      {/*
        Button sizing: full-width on mobile (easy tap), auto-width on desktop.
        Done via a scoped <style> since inline styles can't express media queries.
      */}
      <style>{`
        .vl-cta {
          width: 100%;
        }
        @media (min-width: 540px) {
          .vl-cta {
            width: auto;
            min-width: 160px;
          }
        }
      `}</style>

      {/* ── NAV — full viewport width, logo hard-left, sign-in hard-right ── */}
      <nav style={{
        padding: '18px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: '#fff' }}>
          Vitta
        </span>

        {/* Solid teal button matching the original */}
        <button
          onClick={onGoogleSignIn}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#4ecf9a', color: '#071412',
            fontSize: 14, fontWeight: 700,
            padding: '10px 20px', borderRadius: 999,
            border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          <span style={{
            width: 17, height: 17, background: '#fff', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <GoogleIcon size={10} />
          </span>
          Sign in with Google
        </button>
      </nav>

      {/* ── HERO — centered column, matching original layout ── */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',    /* horizontal center */
        justifyContent: 'center',
        textAlign: 'center',
        padding: '36px 24px 56px',
        width: '100%',
        maxWidth: 560,
        margin: '0 auto',
        boxSizing: 'border-box',
      }}>

        {/* Badge — matches original pill style */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: 'rgba(78,207,154,0.08)',
          border: '1px solid rgba(78,207,154,0.2)',
          borderRadius: 999, padding: '6px 14px',
          marginBottom: 24,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ecf9a', flexShrink: 0 }} />
          <span style={{ color: '#4ecf9a', fontSize: 12, fontWeight: 600 }}>
            UPI payments for NRIs &amp; India travelers
          </span>
        </div>

        {/*
          Headline.

          Font scale: clamp(28px, 7.5vw, 44px)
            iPhone 375 → 7.5vw = 28.1px  → 28px floor   (3 lines, still readable)
            iPhone 430 → 7.5vw = 32.3px  → 32px          (3 lines)
            540px+     → 7.5vw = 40.5px  → ~40px
            587px+     → hits 44px cap

          At 44px in a 512px content area (560px − 48px padding):
            "Scan any UPI QR."           fits on 1 line ✓
            "Pay with your"              breaks naturally (~13 chars)
            "preferred provider."        second green line

          The two green lines are intentional — "Pay with your / preferred provider."
          is a cleaner rhythm than forcing a single overflowing line.
        */}
        <h1 style={{
          fontSize: 'clamp(28px, 7.5vw, 44px)',
          fontWeight: 900,
          lineHeight: 1.08,
          letterSpacing: 'clamp(-1px, -0.25vw, -1.8px)',
          margin: '0 0 18px 0',
          color: '#fff',
        }}>
          Scan any UPI QR.<br />
          <span style={{ color: '#4ecf9a' }}>Pay with your preferred provider.</span>
        </h1>

        {/* Body */}
        <p style={{
          fontSize: 15,
          lineHeight: 1.65,
          color: 'rgba(255,255,255,0.48)',
          maxWidth: 400,
          margin: '0 0 32px 0',
        }}>
          Built for{' '}
          <strong style={{ color: 'rgba(255,255,255,0.88)', fontWeight: 600 }}>
            US-based NRIs and India travelers
          </strong>.
          {' '}Vitta reads UPI QR payments and routes you to supported providers so you can{' '}
          <strong style={{ color: 'rgba(255,255,255,0.88)', fontWeight: 600 }}>
            pay using your own account
          </strong>.
        </p>

        {/* CTA */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 10,
          marginBottom: 36, width: '100%',
        }}>
          <button
            onClick={onGoogleSignIn}
            className="vl-cta"
            style={{
              display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', gap: 10,
              background: '#4ecf9a', color: '#071412',
              fontSize: 15, fontWeight: 700,
              padding: '15px 28px', borderRadius: 14,
              border: 'none', cursor: 'pointer',
              boxShadow: '0 0 32px rgba(78,207,154,0.2)',
              letterSpacing: '-0.1px',
              minHeight: 50,
            }}
          >
            <span style={{
              width: 20, height: 20, background: '#fff', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <GoogleIcon size={12} />
            </span>
            Sign in with Google — it&apos;s free
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', width: '100%', marginBottom: 22 }} />

        {/* Trust items — centered, vertical list */}
        <ul style={{
          listStyle: 'none', padding: 0, margin: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 10,
        }}>
          {TRUST_ITEMS.map(item => (
            <li key={item} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              color: 'rgba(255,255,255,0.4)', fontSize: 13,
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'rgba(78,207,154,0.1)',
                border: '1px solid rgba(78,207,154,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#4ecf9a', fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>✓</span>
              {item}
            </li>
          ))}
        </ul>
      </main>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: '18px 28px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
        flexWrap: 'wrap',
      }}>
        {['Privacy', 'Terms', 'Help'].map(l => (
          <a key={l} href="#" style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, textDecoration: 'none' }}>
            {l}
          </a>
        ))}
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>© 2025 Vitta</span>
      </footer>

    </div>
  );
}
