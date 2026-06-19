'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { logout } from '@/services/authService';

interface StoredUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
}

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function AdminHeader() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore parse error
    }
  }, []);

  const displayName = user?.fullName || user?.email || 'Admin';
  const initials = user ? getInitials(user.fullName, user.email) : 'A';

  return (
    <header style={{
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 24px',
      height: '64px',
      background: '#FAF8FF',
      borderBottom: '1px solid #C3C5D7',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      flexShrink: 0,
    }}>

      {/* Search Input */}
      <div style={{ position: 'relative', width: '448px', height: '38px', flexShrink: 0 }}>
        {/* Search icon */}
        <span style={{
          position: 'absolute',
          left: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#747686" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search events, orders, or guests..."
          style={{
            width: '100%',
            height: '100%',
            background: '#FFFFFF',
            border: '1px solid #C3C5D7',
            borderRadius: '4px',
            padding: '9px 8px 10px 36px',
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            lineHeight: '17px',
            color: '#6B7280',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Right: Icons + Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {/* Icon buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '17px' }}>
          {/* Bell */}
          <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: '#434654' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          {/* Clock / History */}
          <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: '#434654' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          {/* Chat / Message */}
          <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: '#434654' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>

        {/* Avatar + Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '12px',
              background: '#003298',
              border: '1px solid #C3C5D7',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '11px',
              letterSpacing: '0.5px',
              fontFamily: 'var(--font-sans)',
            }}
            aria-label="User menu"
          >
            {initials}
          </button>

          {showMenu && (
            <>
              {/* Backdrop */}
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 50 }}
                onClick={() => setShowMenu(false)}
              />
              {/* Dropdown */}
              <div style={{
                position: 'absolute',
                top: '40px',
                right: 0,
                width: '220px',
                background: '#FFFFFF',
                border: '1px solid #C3C5D7',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                zIndex: 51,
                overflow: 'hidden',
              }}>
                {/* User info */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #E7E7F3' }}>
                  <p style={{ fontWeight: 600, fontSize: '13px', color: '#191B23', margin: 0 }}>{displayName}</p>
                  <p style={{ fontSize: '11px', color: '#6B7280', margin: '2px 0 0' }}>{user?.email}</p>
                  <span style={{
                    display: 'inline-block',
                    marginTop: '6px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: '#E7E7F3',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#003298',
                    letterSpacing: '0.3px',
                  }}>
                    {user?.role || 'ADMIN'}
                  </span>
                </div>

                {/* Links */}
                <div style={{ padding: '6px 0' }}>
                  <Link
                    href="/settings"
                    onClick={() => setShowMenu(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 16px',
                      fontSize: '13px',
                      color: '#434654',
                      textDecoration: 'none',
                      transition: 'background 0.12s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    Settings
                  </Link>

                  <button
                    onClick={() => { logout(); setShowMenu(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 16px',
                      fontSize: '13px',
                      color: '#BA1A1A',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      fontFamily: 'var(--font-sans)',
                      transition: 'background 0.12s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = '#FEF2F2')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}