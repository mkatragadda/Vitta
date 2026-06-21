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
    <div style={{ background: '#071412', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#fff', fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ── NAV ── */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 24px',
      }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.4px' }}>Vitta</div>
        <button
          onClick={onGoogleSignIn}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#4ecf9a', color: '#071412',
            fontSize: 13, fontWeight: 700,
            padding: '9px 18px', borderRadius: 999,
            border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          <span style={{
            width: 16, height: 16, background: '#fff', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <GoogleIcon size={10} />
          </span>
          Sign in
        </button>
      </nav>

      {/* ── HERO ── */}
      <main style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 24px 52px',
        width: '100%', maxWidth: 560, margin: '0 auto',
      }}>

        {/* pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(78,207,154,0.08)',
          border: '1px solid rgba(78,207,154,0.18)',
          borderRadius: 999, padding: '5px 12px',
          marginBottom: 28,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ecf9a', flexShrink: 0 }} />
          <span style={{ color: '#4ecf9a', fontSize: 11, fontWeight: 600 }}>US→India payments · NRIs &amp; travelers</span>
        </div>

        {/* H1 */}
        <h1 className="vl-h1" style={{
          fontSize: 'clamp(40px, 11vw, 64px)',
          fontWeight: 900, lineHeight: 1.0,
          letterSpacing: '-3px', marginBottom: 22, color: '#fff',
        }}>
          Scan in India.<br />
          <em style={{ color: '#4ecf9a', fontStyle: 'normal' }}>Pay in USD.</em>
        </h1>

        {/* subheadline */}
        <p style={{
          fontSize: 'clamp(14px, 3.5vw, 16px)',
          lineHeight: 1.65, color: 'rgba(255,255,255,0.45)',
          maxWidth: 380, margin: '0 auto 38px',
        }}>
          Point your camera at any UPI QR. Vitta shows you the{' '}
          <strong style={{ color: 'rgba(255,255,255,0.82)', fontWeight: 600 }}>INR amount in USD</strong>,
          classifies it as a person or merchant, and opens the right app —
          Wise, Remitly, GPay, or PhonePe.{' '}
          <strong style={{ color: 'rgba(255,255,255,0.82)', fontWeight: 600 }}>You pay with your own accounts.</strong>
        </p>

        {/* CTA */}
        <button
          onClick={onGoogleSignIn}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: '#4ecf9a', color: '#071412',
            fontSize: 15, fontWeight: 700,
            padding: '15px 28px', borderRadius: 14,
            border: 'none', cursor: 'pointer',
            width: '100%', maxWidth: 300,
            marginBottom: 30,
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

        {/* trust items */}
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none', alignItems: 'flex-start' }}>
          {TRUST_ITEMS.map(item => (
            <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'rgba(78,207,154,0.1)',
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
        padding: '16px 24px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', justifyContent: 'center', gap: 20,
      }}>
        {['Privacy', 'Terms', 'Help'].map(l => (
          <a key={l} href="#" style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11, textDecoration: 'none' }}>{l}</a>
        ))}
        <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11 }}>© 2025 Vitta</span>
      </footer>

    </div>
  );
}
