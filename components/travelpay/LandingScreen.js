import React from 'react';

const GoogleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
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
      display: 'inline-flex',
      alignItems: 'center',
      gap: large ? 10 : 8,
      background: '#4ecf9a',
      color: '#071412',
      fontWeight: 700,
      fontSize: large ? 14 : 13,
      padding: large ? '13px 26px' : '8px 18px',
      borderRadius: large ? 12 : 22,
      border: 'none',
      cursor: 'pointer',
      letterSpacing: '-0.1px',
      transition: 'opacity 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
  >
    <span style={{
      width: large ? 22 : 18,
      height: large ? 22 : 18,
      background: '#fff',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <GoogleIcon />
    </span>
    {label}
  </button>
);

export default function LandingScreen({ onGoogleSignIn }) {
  return (
    <div style={{ background: '#071412', minHeight: '100vh', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif", color: '#fff', scrollBehavior: 'smooth' }}>

      {/* ── NAV ── */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky',
        top: 0,
        background: 'rgba(7,20,18,0.92)',
        backdropFilter: 'blur(16px)',
        zIndex: 50,
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px' }}>Vitta</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Nav links — hidden on narrow screens via Tailwind wrapper */}
          <div className="hidden sm:flex" style={{ alignItems: 'center', gap: 4, marginRight: 8 }}>
            {[
              { label: 'How it works', target: 'how-it-works' },
              { label: 'P2P transfers', target: 'intelligence' },
              { label: 'Merchant pay', target: 'intelligence' },
            ].map(({ label, target }) => (
              <button
                key={label}
                onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.42)',
                  fontSize: 13,
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: 8,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.82)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.42)'}
              >
                {label}
              </button>
            ))}
          </div>
          <SignInButton onClick={onGoogleSignIn} label="Sign in" />
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ textAlign: 'center', padding: '60px 24px 52px', maxWidth: 640, margin: '0 auto' }}>
        {/* Pill badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          background: 'rgba(78,207,154,0.09)',
          border: '1px solid rgba(78,207,154,0.22)',
          borderRadius: 20,
          padding: '5px 14px',
          marginBottom: 22,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ecf9a', flexShrink: 0 }} />
          <span style={{ color: '#4ecf9a', fontSize: 12, fontWeight: 600 }}>Smart India payments for NRIs &amp; travelers</span>
        </div>

        {/* H1 */}
        <h1 style={{ fontSize: 'clamp(34px, 6vw, 48px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-1.5px', marginBottom: 16 }}>
          Every India payment.<br />
          <em style={{ color: '#4ecf9a', fontStyle: 'normal' }}>Finally in USD.</em>
        </h1>

        {/* Subtitle */}
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.7, marginBottom: 6, maxWidth: 480, margin: '0 auto 6px' }}>
          Scan any UPI QR, see the amount in <strong style={{ color: 'rgba(255,255,255,0.84)' }}>USD</strong>, and pay with
          confidence — whether you&apos;re paying a <strong style={{ color: 'rgba(255,255,255,0.84)' }}>person</strong>, a{' '}
          <strong style={{ color: 'rgba(255,255,255,0.84)' }}>merchant</strong>, or someone you pay often.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.24)', fontSize: 13, lineHeight: 1.65, maxWidth: 420, margin: '0 auto 30px' }}>
          Vitta brings clarity to India payments today, and over time, more of the payment happens directly inside Vitta.
        </p>

        {/* CTA */}
        <div style={{ marginBottom: 24 }}>
          <SignInButton onClick={onGoogleSignIn} label="Sign in with Google" large />
        </div>

        {/* Trust lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
          {[
            'Your money stays in your existing accounts',
            'Works with Wise, Remitly, GPay, PhonePe & banks',
            'Works on any UPI QR',
          ].map(line => (
            <div key={line} style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,0.28)', fontSize: 12 }}>
              <span style={{ color: '#4ecf9a', fontWeight: 700, fontSize: 11 }}>✓</span>
              {line}
            </div>
          ))}
        </div>
      </section>

      {/* ── INTELLIGENCE CARD ── */}
      <section id="intelligence" style={{ padding: '0 20px 52px', maxWidth: 860, margin: '0 auto' }}>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20,
          padding: '28px 24px 24px',
        }}>
          {/* Card header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ color: '#4ecf9a', fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 8 }}>
              Vitta intelligence
            </div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 6 }}>
              Every payment starts with clarity.
            </div>
            <div style={{ color: 'rgba(255,255,255,0.34)', fontSize: 13, lineHeight: 1.6, maxWidth: 480, margin: '0 auto' }}>
              Vitta understands who you&apos;re paying, shows what it costs in USD, and helps you choose the best way to pay —
              while remembering the people and merchants you pay in India.
            </div>
          </div>

          {/* P2P / Center / P2M grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 1fr', gap: 0, alignItems: 'center' }}>

            {/* P2P */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(139,107,255,0.2)',
              borderRadius: 14,
              padding: '16px 14px',
            }}>
              <div style={{
                display: 'inline-block',
                background: 'rgba(139,107,255,0.11)',
                color: '#9b7dff',
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 5,
                marginBottom: 9,
                letterSpacing: '0.4px',
              }}>
                P2P — Person-to-person
              </div>
              <div style={{ color: '#fff', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>Sending money to someone</div>
              <div style={{ color: 'rgba(255,255,255,0.26)', fontSize: 10, marginBottom: 10 }}>Personal contact detected</div>
              <div style={{ color: 'rgba(255,255,255,0.36)', fontSize: 11, lineHeight: 1.5, marginBottom: 11 }}>
                Pay family, friends, helpers, and personal contacts in India with more context and less repeated setup.
              </div>
              {/* Amount box */}
              <div style={{
                background: 'rgba(0,0,0,0.22)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 9,
                padding: '8px 10px',
                marginBottom: 11,
              }}>
                <div style={{ color: 'rgba(255,255,255,0.24)', fontSize: 9, marginBottom: 3 }}>Amount scanned</div>
                <div style={{ color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: 600 }}>₹5,000 to rahul@upi</div>
                <div style={{ color: '#4ecf9a', fontSize: 10, marginTop: 2 }}>≈ $59.82 USD at live rate</div>
              </div>
              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 9px', borderRadius: 8,
                  background: 'rgba(78,207,154,0.07)', border: '1px solid rgba(78,207,154,0.18)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ecf9a' }} />
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>Best remittance route</span>
                  </div>
                  <span style={{ color: '#4ecf9a', fontSize: 9, fontWeight: 700 }}>Best rate</span>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 9px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Other options</span>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 700 }}>Compare</span>
                </div>
              </div>
            </div>

            {/* Center orb */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 1, height: 20, background: 'rgba(78,207,154,0.18)' }} />
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: '#4ecf9a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 800, color: '#071412',
              }}>V</div>
              <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: 8, fontWeight: 700, letterSpacing: '0.6px' }}>ROUTES</div>
              <div style={{ width: 1, height: 20, background: 'rgba(78,207,154,0.18)' }} />
            </div>

            {/* P2M */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,140,80,0.2)',
              borderRadius: 14,
              padding: '16px 14px',
            }}>
              <div style={{
                display: 'inline-block',
                background: 'rgba(255,140,80,0.11)',
                color: '#ff9055',
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 5,
                marginBottom: 9,
                letterSpacing: '0.4px',
              }}>
                P2M — Merchant
              </div>
              <div style={{ color: '#fff', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>Paying a shop</div>
              <div style={{ color: 'rgba(255,255,255,0.26)', fontSize: 10, marginBottom: 10 }}>Merchant detected</div>
              <div style={{ color: 'rgba(255,255,255,0.36)', fontSize: 11, lineHeight: 1.5, marginBottom: 11 }}>
                Pay everyday merchants with a clearer view of the cost before you confirm — same simple scan.
              </div>
              {/* Amount box */}
              <div style={{
                background: 'rgba(0,0,0,0.22)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 9,
                padding: '8px 10px',
                marginBottom: 11,
              }}>
                <div style={{ color: 'rgba(255,255,255,0.24)', fontSize: 9, marginBottom: 3 }}>Amount scanned</div>
                <div style={{ color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: 600 }}>₹850 at Chai Point</div>
                <div style={{ color: '#4ecf9a', fontSize: 10, marginTop: 2 }}>≈ $10.16 USD at live rate</div>
              </div>
              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 9px', borderRadius: 8,
                  background: 'rgba(78,207,154,0.07)', border: '1px solid rgba(78,207,154,0.18)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ecf9a' }} />
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>Available payment app</span>
                  </div>
                  <span style={{ color: '#4ecf9a', fontSize: 9, fontWeight: 700 }}>Launch UPI</span>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 9px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Other options</span>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 700 }}>Choose</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ padding: '0 20px 52px', maxWidth: 860, margin: '0 auto' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ color: '#4ecf9a', fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 8 }}>
            How it works
          </div>
          <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>
            Scan, understand, pay.
          </div>
        </div>

        {/* 3-step strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1,
          background: 'rgba(255,255,255,0.07)',
          borderRadius: 14,
          overflow: 'hidden',
        }}>
          {/* Step 01 */}
          <div style={{ background: '#071412', padding: '20px 16px' }}>
            <div style={{ color: '#4ecf9a', fontSize: 10, fontWeight: 800, letterSpacing: '0.5px', marginBottom: 8 }}>01</div>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>Scan any UPI QR</div>
            <div style={{ color: 'rgba(255,255,255,0.34)', fontSize: 12, lineHeight: 1.55 }}>
              Use Vitta to scan a QR from a person, shop, or service in India.
            </div>
          </div>

          {/* Step 02 */}
          <div style={{ background: '#071412', padding: '20px 16px' }}>
            <div style={{ color: '#4ecf9a', fontSize: 10, fontWeight: 800, letterSpacing: '0.5px', marginBottom: 8 }}>02</div>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>See who you&apos;re paying and what it costs</div>
            <div style={{ color: 'rgba(255,255,255,0.34)', fontSize: 12, lineHeight: 1.55, marginBottom: 9 }}>
              Vitta identifies the type, shows INR in USD, and compares available paths.
            </div>
            <div style={{
              background: 'rgba(78,207,154,0.05)',
              border: '1px solid rgba(78,207,154,0.14)',
              borderRadius: 8,
              padding: '7px 10px',
              display: 'flex',
              gap: 7,
            }}>
              <div style={{ color: 'rgba(255,255,255,0.36)', fontSize: 10, lineHeight: 1.5 }}>
                <strong style={{ color: '#4ecf9a', fontWeight: 600 }}>VPA memory:</strong> If you&apos;ve paid this contact before, Vitta remembers the name and history.
              </div>
            </div>
          </div>

          {/* Step 03 */}
          <div style={{ background: '#071412', padding: '20px 16px' }}>
            <div style={{ color: '#4ecf9a', fontSize: 10, fontWeight: 800, letterSpacing: '0.5px', marginBottom: 8 }}>03</div>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>Pay with confidence</div>
            <div style={{ color: 'rgba(255,255,255,0.34)', fontSize: 12, lineHeight: 1.55, marginBottom: 9 }}>
              Vitta helps you continue with the right payment path, keeping India payments organised.
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {[
                { label: 'Personal', bg: 'rgba(139,107,255,0.1)', color: '#9b7dff' },
                { label: 'Merchant', bg: 'rgba(255,140,80,0.1)', color: '#ff9055' },
                { label: 'Repeat', bg: 'rgba(78,207,154,0.1)', color: '#4ecf9a' },
              ].map(({ label, bg, color }) => (
                <span key={label} style={{
                  background: bg, color,
                  fontSize: 9, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 4,
                }}>{label}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '48px 24px',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: 10 }}>
          The easiest way to stay on top<br />
          of <em style={{ color: '#4ecf9a', fontStyle: 'normal' }}>India payments.</em>
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 14, lineHeight: 1.65, maxWidth: 380, margin: '0 auto 24px' }}>
          One place to understand, compare, and manage how you pay in India — simpler today, more built-in over time.
        </p>
        <SignInButton onClick={onGoogleSignIn} label="Get started — it's free" large />
      </footer>

    </div>
  );
}
