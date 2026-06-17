'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// ── Icon components ────────────────────────────────────────────────────
function IconBadge() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M2 10h3M19 10h3" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconGate() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="8" height="18" rx="1" />
      <rect x="14" y="3" width="8" height="18" rx="1" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function IconQR() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="3" height="3" />
      <line x1="17" y1="17" x2="21" y2="17" />
      <line x1="21" y1="14" x2="21" y2="21" />
    </svg>
  );
}

// ── Gate options ───────────────────────────────────────────────────────
const GATES = [
  'Cổng VIP (Tầng 1)',
  'Cổng General (Tầng 1)',
  'Cổng General (Tầng 2)',
  'Cổng Nhân viên',
];

// ── Main component ─────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [gate, setGate] = useState(GATES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!staffId.trim() || !password.trim()) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    setError('');
    setLoading(true);
    // Simulate auth delay — replace with real API call
    await new Promise(r => setTimeout(r, 900));
    setLoading(false);
    router.push('/checkin');
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0D0D0F',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#FFFFFF',
    }}>
      <div style={{ width: '100%', maxWidth: '390px', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* ── Top bar ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '52px 24px 20px',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Bar chart icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C5CFC" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '1.5px', color: '#FFFFFF' }}>
              TICKETSCAN
            </span>
          </div>
        </div>

        {/* ── Status Info ── */}
        <div style={{ padding: '0 24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#4ADE80',
              boxShadow: '0 0 8px #4ADE80',
              animation: 'pulse 2s infinite'
            }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#4ADE80', letterSpacing: '0.5px' }}>
              HỆ THỐNG TRỰC TUYẾN
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
            Sẵn sàng quét vé
          </span>
        </div>


        {/* ── Form area ── */}
        <div style={{ padding: '0 24px', flex: 1 }}>
          {/* Heading */}
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 6px', lineHeight: 1.2 }}>
            Đăng nhập
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '0 0 28px', lineHeight: '1.5' }}>
            Vui lòng nhập thông tin nhân viên để bắt đầu.
          </p>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '13px',
              color: '#FCA5A5',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          {/* ── Staff ID field ── */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '1px',
              color: 'rgba(255,255,255,0.45)',
              marginBottom: '8px',
              textTransform: 'uppercase',
            }}>
              Mã nhân viên
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '14px', top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center',
                pointerEvents: 'none',
              }}>
                <IconBadge />
              </span>
              <input
                type="text"
                value={staffId}
                onChange={e => setStaffId(e.target.value)}
                placeholder="VD: STF-9921"
                style={{
                  width: '100%',
                  height: '52px',
                  background: '#1C1C1E',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: '10px',
                  padding: '0 14px 0 46px',
                  fontSize: '15px',
                  color: '#FFFFFF',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  letterSpacing: '0.3px',
                  caretColor: '#7C5CFC',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,92,252,0.6)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
              />
            </div>
          </div>

          {/* ── Password field ── */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '1px',
              color: 'rgba(255,255,255,0.45)',
              marginBottom: '8px',
              textTransform: 'uppercase',
            }}>
              Mật khẩu
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '14px', top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center',
                pointerEvents: 'none',
              }}>
                <IconLock />
              </span>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  height: '52px',
                  background: '#1C1C1E',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: '10px',
                  padding: '0 14px 0 46px',
                  fontSize: '15px',
                  color: '#FFFFFF',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  caretColor: '#7C5CFC',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,92,252,0.6)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              />
            </div>
          </div>

          {/* ── Gate selector ── */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '1px',
              color: 'rgba(255,255,255,0.45)',
              marginBottom: '8px',
              textTransform: 'uppercase',
            }}>
              Cổng soát vé
            </label>
            <div style={{ position: 'relative' }}>
              {/* Gate icon */}
              <span style={{
                position: 'absolute', left: '14px', top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center',
                pointerEvents: 'none',
                zIndex: 1,
              }}>
                <IconGate />
              </span>
              <select
                value={gate}
                onChange={e => setGate(e.target.value)}
                style={{
                  width: '100%',
                  height: '52px',
                  background: '#1C1C1E',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: '10px',
                  padding: '0 44px 0 46px',
                  fontSize: '15px',
                  color: '#FFFFFF',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              >
                {GATES.map(g => (
                  <option key={g} value={g} style={{ background: '#1C1C1E' }}>{g}</option>
                ))}
              </select>
              {/* Chevron */}
              <span style={{
                position: 'absolute', right: '14px', top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.35)',
                pointerEvents: 'none',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>
          </div>

          {/* ── Submit button ── */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%',
              height: '56px',
              background: loading ? '#5A3FC0' : 'linear-gradient(135deg, #7C5CFC 0%, #5A3FC0 100%)',
              border: 'none',
              borderRadius: '14px',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 700,
              letterSpacing: '0.8px',
              cursor: loading ? 'default' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: loading ? 'none' : '0 4px 24px rgba(124,92,252,0.4)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ animation: 'spin 0.8s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Đang xác thực...
              </>
            ) : (
              <>
                BẮT ĐẦU CA LÀM VIỆC
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.3px' }}>
            v4.2.0
          </span>
        </div>
      </div>

      {/* Spin animation */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.5; box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
          70% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 6px rgba(74, 222, 128, 0); }
          100% { transform: scale(0.95); opacity: 0.5; box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
        }
        input::placeholder { color: rgba(255,255,255,0.2); }
        select option { background: #1C1C1E; color: #FFFFFF; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

    </div>
  );
}
