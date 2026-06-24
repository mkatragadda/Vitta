import React from 'react';
import { LogOut, ChevronRight } from 'lucide-react';

const ACCENT  = '#4ecf9a';
const SURFACE = 'rgba(255,255,255,0.04)';
const BORDER  = 'rgba(255,255,255,0.07)';

const initials = (name) =>
  (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const SettingsRow = ({ label, right, danger }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 14px',
    background: '#0d1f1a',
  }}>
    <span style={{ color: danger ? '#ff6b6b' : '#fff', fontSize: 13, fontWeight: 600 }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.28)', fontSize: 12 }}>
      {right}
      {!danger && <ChevronRight size={14} />}
    </div>
  </div>
);

const SectionGroup = ({ title, children }) => (
  <div style={{ margin: '0 16px 16px' }}>
    <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 7, paddingLeft: 2 }}>
      {title}
    </div>
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1 }}>
      {children}
    </div>
  </div>
);

export default function YouScreen({ userData, onLogout }) {
  const name  = userData?.name || userData?.email?.split('@')[0] || 'You';
  const email = userData?.email || '';

  return (
    <div style={{ minHeight: '100%', paddingBottom: 80 }}>

      {/* Top bar */}
      <div style={{ padding: '18px 20px 10px', display: 'flex', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>You</span>
      </div>

      {/* User hero card */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 13,
        margin: '0 16px 18px',
        background: SURFACE, border: `1px solid ${BORDER}`,
        borderRadius: 15, padding: '14px',
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: '50%',
          background: 'rgba(78,207,154,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: ACCENT, flexShrink: 0,
        }}>
          {initials(name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{name}</div>
          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
        </div>
      </div>

      {/* Account section */}
      <SectionGroup title="Account">
        <SettingsRow label="Google account" right={
          <span style={{ background: 'rgba(78,207,154,0.11)', color: ACCENT, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>Connected</span>
        } />
        <SettingsRow label="Notifications" />
        <SettingsRow label="Privacy &amp; security" />
      </SectionGroup>

      {/* Support section */}
      <SectionGroup title="Support">
        <SettingsRow label="Help &amp; feedback" />
        <div
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px', background: '#0d1f1a', cursor: 'pointer',
          }}
        >
          <LogOut size={14} color="#ff6b6b" />
          <span style={{ color: '#ff6b6b', fontSize: 13, fontWeight: 600 }}>Sign out</span>
        </div>
      </SectionGroup>

      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.14)', fontSize: 11, paddingTop: 4 }}>
        Vitta · v1.0.0
      </div>
    </div>
  );
}
