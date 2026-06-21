import React from 'react';

const GoogleIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const SignInButton = ({ onClick, label = 'Sign in with Google', large = false }) => (
  <button
    onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: large ? 10 : 7,
      background: '#4ecf9a', color: '#071412',
      fontWeight: 700, fontSize: large ? 15 : 13,
      padding: large ? '14px 28px' : '8px 16px',
      borderRadius: large ? 14 : 999,
      border: 'none', cursor: 'pointer',
      width: large ? '100%' : 'auto',
      maxWidth: large ? 300 : 'none',
      transition: 'opacity 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
  >
    <span style={{
      width: large ? 20 : 16, height: large ? 20 : 16,
      background: '#fff', borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <GoogleIcon size={large ? 12 : 10} />
    </span>
    {label}
  </button>
);

// ── Rail (P2P / P2M card) ─────────────────────────────────────────────────────
const Rail = ({ type, badge, badgeBg, badgeColor, borderColor, name, sub, desc, amountLine, amountUsd, optPrimary, optPrimaryHint, optSecondary }) => (
  <div style={{
    flex: 1,
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${borderColor}`,
    borderRadius: 14, padding: '16px 14px',
  }}>
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 700,
      padding: '3px 9px', borderRadius: 6, marginBottom: 9,
      letterSpacing: '0.4px', background: badgeBg, color: badgeColor,
    }}>{badge}</span>
    <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{name}</div>
    <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, marginBottom: 9 }}>{sub}</div>
    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1.55, marginBottom: 11 }}>{desc}</p>
    {/* amount box */}
    <div style={{
      background: 'rgba(0,0,0,0.2)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 9, padding: '9px 11px', marginBottom: 11,
    }}>
      <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, marginBottom: 3 }}>Amount scanned</div>
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600 }}>{amountLine}</div>
      <div style={{ color: '#4ecf9a', fontSize: 11, marginTop: 2 }}>≈ {amountUsd} at live rate</div>
    </div>
    {/* options */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', borderRadius: 8,
        background: 'rgba(78,207,154,0.07)', border: '1px solid rgba(78,207,154,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ecf9a' }} />
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{optPrimary}</span>
        </div>
        <span style={{ color: '#4ecf9a', fontSize: 10, fontWeight: 600 }}>{optPrimaryHint}</span>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', borderRadius: 8,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{optSecondary}</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10 }}>Compare</span>
      </div>
    </div>
  </div>
);

// ── V divider ─────────────────────────────────────────────────────────────────
const VDividerMobile = () => (
  <div className="vitta-v-mobile" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
    <div style={{
      width: 34, height: 34, borderRadius: '50%',
      background: '#4ecf9a', color: '#071412',
      fontSize: 12, fontWeight: 800,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>V</div>
    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
  </div>
);

const VDividerDesktop = () => (
  <div className="vitta-v-desktop" style={{
    display: 'none', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 6, width: 64, flexShrink: 0,
  }}>
    <div style={{ width: 1, height: 24, background: 'rgba(78,207,154,0.18)' }} />
    <div style={{
      width: 34, height: 34, borderRadius: '50%',
      background: '#4ecf9a', color: '#071412',
      fontSize: 12, fontWeight: 800,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>V</div>
    <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: 9, fontWeight: 700, letterSpacing: '0.5px' }}>ROUTES</div>
    <div style={{ width: 1, height: 24, background: 'rgba(78,207,154,0.18)' }} />
  </div>
);

// ── Step (How it works) ───────────────────────────────────────────────────────
const Step = ({ num, title, desc, children, last }) => (
  <li className="vitta-step" style={{ display: 'flex', gap: 16 }}>
    {/* left: number + connector line */}
    <div className="vitta-step-left" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: '#4ecf9a', color: '#071412',
        fontSize: 13, fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{num}</div>
      {!last && (
        <div className="vitta-step-line" style={{ width: 1, flex: 1, minHeight: 20, background: 'rgba(78,207,154,0.18)', margin: '5px 0' }} />
      )}
    </div>
    {/* right: content */}
    <div className="vitta-step-right" style={{ paddingBottom: last ? 0 : 24, paddingTop: 3, flex: 1 }}>
      <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.65 }}>{desc}</p>
      {children}
    </div>
  </li>
);

// ── Main component ────────────────────────────────────────────────────────────
export default function LandingScreen({ onGoogleSignIn }) {
  return (
    <div style={{ background: '#071412', minHeight: '100vh', color: '#fff', fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 20px',
        background: 'rgba(7,20,18,0.94)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px' }}>Vitta</div>
        <SignInButton onClick={onGoogleSignIn} label="Sign in" />
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding: '44px 20px 40px', textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
        {/* pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(78,207,154,0.1)', border: '1px solid rgba(78,207,154,0.2)',
          borderRadius: 999, padding: '5px 13px', marginBottom: 22,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ecf9a' }} />
          <span style={{ color: '#4ecf9a', fontSize: 12, fontWeight: 600 }}>Smart India payments for NRIs &amp; travelers</span>
        </div>

        {/* H1 */}
        <h1 style={{ fontSize: 'clamp(30px, 9vw, 52px)', fontWeight: 900, lineHeight: 1.06, letterSpacing: '-1.5px', marginBottom: 16 }}>
          Every India payment.<br />
          <em style={{ color: '#4ecf9a', fontStyle: 'normal' }}>Finally in USD.</em>
        </h1>

        {/* subtitles */}
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.65, maxWidth: 480, margin: '0 auto 8px' }}>
          Scan any UPI QR, see the amount in <strong style={{ color: '#fff', fontWeight: 600 }}>USD</strong>, and pay
          with confidence — whether you&apos;re paying a <strong style={{ color: '#fff', fontWeight: 600 }}>person</strong>,
          a <strong style={{ color: '#fff', fontWeight: 600 }}>merchant</strong>, or someone you pay often.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, lineHeight: 1.6, maxWidth: 360, margin: '0 auto 28px' }}>
          Vitta brings clarity to India payments today, and over time, more of the payment happens directly inside Vitta.
        </p>

        {/* CTA */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
          <div className="vitta-cta" style={{ width: '100%', maxWidth: 300 }}>
            <SignInButton onClick={onGoogleSignIn} label="Sign in with Google" large />
          </div>
        </div>

        {/* trust lines */}
        <ul className="vitta-trust" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', listStyle: 'none' }}>
          {[
            'Your money stays in your existing accounts',
            'Works with Wise, Remitly, GPay, PhonePe & banks',
            'Works on any UPI QR',
          ].map(line => (
            <li key={line} style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ color: '#4ecf9a', fontSize: 11, fontWeight: 700 }}>✓</span>
              {line}
            </li>
          ))}
        </ul>
      </section>

      {/* ── INTELLIGENCE / ROUTER CARD ── */}
      <div id="intelligence" className="vitta-section-wrap" style={{ padding: '0 16px 44px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: '24px 18px 20px',
        }}>
          {/* header */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <p style={{ color: '#4ecf9a', fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 7 }}>
              Vitta intelligence
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 5 }}>
              Every payment starts with clarity.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.6, maxWidth: 480, margin: '0 auto' }}>
              Vitta classifies the QR and suggests the best way to pay — you confirm in your existing app.
            </p>
          </div>

          {/* rails grid */}
          <div className="vitta-router-grid" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Rail
              badge="P2P — Person-to-person"
              badgeBg="rgba(139,107,255,0.12)" badgeColor="#9b7dff"
              borderColor="rgba(139,107,255,0.22)"
              name="Sending money to someone"
              sub="Personal contact detected"
              desc="Pay family, friends, and personal contacts with more context and less repeated setup."
              amountLine="₹5,000 to rahul@upi"
              amountUsd="$59.82 USD"
              optPrimary="Best remittance route"
              optPrimaryHint="Best rate"
              optSecondary="Other available options"
            />

            <VDividerMobile />
            <VDividerDesktop />

            <Rail
              badge="P2M — Merchant payment"
              badgeBg="rgba(255,140,80,0.12)" badgeColor="#ff9055"
              borderColor="rgba(255,140,80,0.22)"
              name="Paying a shop or service"
              sub="Merchant detected"
              desc="Pay everyday merchants with a clearer view of the cost before you confirm."
              amountLine="₹850 at Chai Point"
              amountUsd="$10.16 USD"
              optPrimary="Available payment app"
              optPrimaryHint="Launch UPI"
              optSecondary="Other available options"
            />
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="vitta-section-wrap" style={{ padding: '0 16px 44px', maxWidth: 900, margin: '0 auto' }}>
        <p style={{ color: '#4ecf9a', fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 7 }}>
          How it works
        </p>
        <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.4px', marginBottom: 24 }}>
          Scan, understand, pay.
        </h2>

        <ol className="vitta-steps" style={{ display: 'flex', flexDirection: 'column', gap: 0, listStyle: 'none' }}>
          <Step num={1} title="Scan any UPI QR"
            desc="Open Vitta and point your camera at any UPI QR — shop, restaurant, or friend's link."
          />
          <Step num={2} title="See who you're paying and what it costs"
            desc="Vitta identifies the type, shows the INR amount in USD at the live rate, and compares available paths."
          >
            <div style={{
              background: 'rgba(78,207,154,0.05)',
              border: '1px solid rgba(78,207,154,0.14)',
              borderRadius: 10, padding: '10px 12px',
              display: 'flex', gap: 8, marginTop: 10,
            }}>
              <span style={{ color: '#4ecf9a', fontSize: 13, flexShrink: 0, marginTop: 1 }}>✦</span>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1.55, margin: 0 }}>
                <strong style={{ color: '#4ecf9a', fontWeight: 600 }}>VPA memory:</strong> If you&apos;ve paid this
                contact before, Vitta remembers the name, past amounts, and history.
              </p>
            </div>
          </Step>
          <Step num={3} last title="Pay with confidence"
            desc="Vitta helps you continue with the right payment path, keeping your India payments organised and easy to repeat."
          >
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {[
                { label: 'Personal',      bg: 'rgba(139,107,255,0.1)', color: '#9b7dff' },
                { label: 'Merchant',      bg: 'rgba(255,140,80,0.1)',  color: '#ff9055' },
                { label: 'Repeat payees', bg: 'rgba(78,207,154,0.1)', color: '#4ecf9a' },
              ].map(({ label, bg, color }) => (
                <span key={label} style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 5, background: bg, color }}>
                  {label}
                </span>
              ))}
            </div>
          </Step>
        </ol>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        background: 'rgba(78,207,154,0.04)',
        borderTop: '1px solid rgba(78,207,154,0.1)',
        padding: '48px 20px',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 'clamp(22px, 6vw, 30px)', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.15, marginBottom: 10 }}>
          The easiest way to stay on top of <em style={{ color: '#4ecf9a', fontStyle: 'normal' }}>India payments.</em>
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.65, maxWidth: 400, margin: '0 auto 24px' }}>
          One place to understand, compare, and manage how you pay in India — simpler today, more built-in over time.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 300 }}>
            <SignInButton onClick={onGoogleSignIn} label="Get started — it's free" large />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 32, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {['Privacy', 'Terms', 'Help'].map(link => (
            <a key={link} href="#" style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, textDecoration: 'none' }}>{link}</a>
          ))}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, marginTop: 10 }}>
          &copy; 2025 Vitta &middot; getvitta.com
        </p>
      </footer>
    </div>
  );
}
