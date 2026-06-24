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
  'No wallet — your money stays in your accounts',
  'Works with apps you already have',
  'Works on any UPI QR in India',
];

export default function LandingScreen({ onGoogleSignIn }) {
  return (
    <div style={{
      background: '#071412', minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      color: '#fff',
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>

      {/* ── NAV ── */}
      <nav className="vl-nav" style={{
        padding: '20px 28px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div className="vl-logo" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.6px', color: '#fff' }}>
          Vitta
        </div>
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

      {/* ── HERO ── */}
      <main className="vl-hero" style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        textAlign: 'center',
        padding: '28px 28px 44px',
        width: '100%', maxWidth: 580, margin: '0 auto',
      }}>

        {/* pill */}
        <div className="vl-pill" style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: 'rgba(78,207,154,0.08)',
          border: '1px solid rgba(78,207,154,0.2)',
          borderRadius: 999, padding: '6px 14px',
          marginBottom: 22,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ecf9a', flexShrink: 0 }} />
          <span style={{ color: '#4ecf9a', fontSize: 12, fontWeight: 600 }}>
            US→India payments · NRIs &amp; travelers
          </span>
        </div>

        {/* H1 */}
        <h1 style={{
          fontSize: 'clamp(36px, 8.5vw, 56px)',
          fontWeight: 900, lineHeight: 1.04,
          letterSpacing: 'clamp(-2px, -0.4vw, -2.5px)',
          marginBottom: 18, color: '#fff',
        }}>
          Scan in India.<br />
          <em className="vl-em" style={{ color: '#4ecf9a', fontStyle: 'normal', display: 'block' }}>Pay in USD.</em>
        </h1>

        {/* subhead */}
        <p className="vl-subhead" style={{
          fontSize: 15, lineHeight: 1.6,
          color: 'rgba(255,255,255,0.48)',
          maxWidth: 360, marginBottom: 32,
        }}>
          Point your camera at any UPI QR. Vitta shows the{' '}
          <strong style={{ color: 'rgba(255,255,255,0.88)', fontWeight: 600 }}>INR amount in USD</strong>,
          classifies it, and opens Wise, Remitly, GPay, or PhonePe.{' '}
          <strong style={{ color: 'rgba(255,255,255,0.88)', fontWeight: 600 }}>You pay with your own accounts.</strong>
        </p>

        {/* CTA */}
        <button
          onClick={onGoogleSignIn}
          className="vl-cta"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: '#4ecf9a', color: '#071412',
            fontSize: 15, fontWeight: 700,
            padding: '15px 32px', borderRadius: 14,
            border: 'none', cursor: 'pointer',
            marginBottom: 28, whiteSpace: 'nowrap',
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

        {/* trust */}
        <ul className="vl-trust" style={{
          display: 'flex', flexDirection: 'column',
          gap: 9, listStyle: 'none', alignItems: 'center',
        }}>
          {TRUST_ITEMS.map(item => (
            <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'rgba(255,255,255,0.42)', fontSize: 13 }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'rgba(78,207,154,0.12)',
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
        display: 'flex', justifyContent: 'center', gap: 24,
      }}>
        {['Privacy', 'Terms', 'Help'].map(l => (
          <a key={l} href="#" style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, textDecoration: 'none' }}>{l}</a>
        ))}
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>© 2025 Vitta</span>
      </footer>

    </div>
  );
}
