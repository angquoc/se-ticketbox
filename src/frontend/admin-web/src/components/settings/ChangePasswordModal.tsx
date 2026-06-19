import React, { useState } from 'react';
import { changePassword } from '@/services/authService';

interface ChangePasswordModalProps {
  onClose: () => void;
}

export default function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm || !current || !next) return;
    if (next.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await changePassword(current, next);
      setDone(true);
      setTimeout(onClose, 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (Array.isArray(msg)) {
        setError(msg.join(', '));
      } else {
        setError(msg || 'Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu hiện tại.');
      }
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    height: '36px',
    border: '1px solid #C3C5D7',
    borderRadius: '4px',
    padding: '0 10px',
    fontSize: '13px',
    color: '#191B23',
    background: '#FFFFFF',
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: '8px',
        padding: '28px', width: '380px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#191B23', margin: '0 0 20px' }}>
          Change Password
        </h3>

        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '16px 0' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <p style={{ fontSize: '13px', color: '#434654', margin: 0 }}>Password updated successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {error && (
              <div style={{
                padding: '10px 12px',
                background: '#FEE2E2',
                border: '1px solid #FECACA',
                borderRadius: '4px',
                color: '#991B1B',
                fontSize: '12px',
                lineHeight: '1.5',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#9CA3AF' }}>
                Current Password
              </label>
              <input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                style={inputStyle}
                autoComplete="current-password"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#9CA3AF' }}>
                New Password
              </label>
              <input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                style={inputStyle}
                autoComplete="new-password"
                placeholder="Minimum 6 characters"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#9CA3AF' }}>
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                style={inputStyle}
                autoComplete="new-password"
              />
              {next && confirm && next !== confirm && (
                <p style={{ fontSize: '11px', color: '#BA1A1A', margin: 0 }}>Passwords do not match</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button type="button" onClick={onClose} style={{
                flex: 1, height: '36px', border: '1px solid #C3C5D7', borderRadius: '4px',
                background: '#FFFFFF', color: '#434654', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || next !== confirm || !current || !next}
                style={{
                  flex: 1, height: '36px', border: 'none', borderRadius: '4px',
                  background: saving ? '#6B8CC7' : '#003298', color: '#FFFFFF',
                  fontSize: '13px', fontWeight: 500,
                  cursor: saving || next !== confirm || !current || !next ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-sans)',
                  opacity: next !== confirm || !current || !next ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
