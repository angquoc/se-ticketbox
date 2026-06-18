'use client';

import { useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────

interface ProfileForm {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  organizationName: string;
  organizationWebsite: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#9CA3AF' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ReadonlyField({ value }: { value: string }) {
  return (
    <div style={{
      height: '36px', border: '1px solid #E7E7F3', borderRadius: '4px',
      padding: '0 10px', display: 'flex', alignItems: 'center',
      fontSize: '13px', color: '#191B23', background: '#F9FAFB',
    }}>
      {value}
    </div>
  );
}

function EditableField({
  value,
  onChange,
  placeholder,
  editing,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  editing: boolean;
}) {
  if (!editing) return <ReadonlyField value={value || '—'} />;
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
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
        boxSizing: 'border-box',
        transition: 'border-color 0.15s',
      }}
      onFocus={(e) => (e.target.style.borderColor = '#003298')}
      onBlur={(e) => (e.target.style.borderColor = '#C3C5D7')}
    />
  );
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #C3C5D7',
      borderRadius: '8px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', borderBottom: '1px solid #C3C5D7',
      }}>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#191B23', margin: 0 }}>{title}</p>
          {description && (
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>{description}</p>
          )}
        </div>
        {action}
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  );
}

// ── Toggle Switch ──────────────────────────────────────────────────────

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
      <span style={{ fontSize: '13px', color: '#191B23' }}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: '40px', height: '22px',
          borderRadius: '11px', border: 'none',
          background: checked ? '#003298' : '#D1D5DB',
          position: 'relative', cursor: 'pointer',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
        aria-checked={checked}
        role="switch"
      >
        <span style={{
          position: 'absolute',
          top: '3px',
          left: checked ? '21px' : '3px',
          width: '16px', height: '16px',
          borderRadius: '50%',
          background: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}

// ── Change Password Modal ──────────────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm || !current) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800)); // TODO: call API
    setSaving(false);
    setDone(true);
    setTimeout(onClose, 1200);
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
            <p style={{ fontSize: '13px', color: '#434654', margin: 0 }}>Password updated!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Field label="Current Password">
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="New Password">
              <input type="password" value={next} onChange={(e) => setNext(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Confirm New Password">
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={inputStyle} />
              {next && confirm && next !== confirm && (
                <p style={{ fontSize: '11px', color: '#BA1A1A', margin: 0 }}>Passwords do not match</p>
              )}
            </Field>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button type="button" onClick={onClose} style={{
                flex: 1, height: '36px', border: '1px solid #C3C5D7', borderRadius: '4px',
                background: '#FFFFFF', color: '#434654', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}>
                Cancel
              </button>
              <button type="submit" disabled={saving || next !== confirm || !current || !next} style={{
                flex: 1, height: '36px', border: 'none', borderRadius: '4px',
                background: saving ? '#6B8CC7' : '#003298', color: '#FFFFFF',
                fontSize: '13px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)',
              }}>
                {saving ? 'Saving…' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [editing, setEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);

  const [profile, setProfile] = useState<ProfileForm>({
    fullName: 'Admin User',
    email: 'admin@ticketbox.vn',
    phone: '+84 90 000 0000',
    role: 'ORGANIZER',
    organizationName: 'TicketBox Events',
    organizationWebsite: 'https://ticketbox.vn',
  });
  const [draft, setDraft] = useState<ProfileForm>(profile);

  const [notifications, setNotifications] = useState({
    newOrder: true,
    paymentFailed: true,
    uploadComplete: true,
    checkinAnomaly: false,
    weeklyReport: true,
  });

  const handleEditToggle = () => {
    if (!editing) {
      setDraft({ ...profile });
      setEditing(true);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await new Promise((r) => setTimeout(r, 800)); // TODO: call API
      setProfile({ ...draft });
      setSavedProfile(true);
      setEditing(false);
      setTimeout(() => setSavedProfile(false), 2500);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setDraft({ ...profile });
    setEditing(false);
  };

  const updateDraft = (field: keyof ProfileForm) => (val: string) => {
    setDraft((prev) => ({ ...prev, [field]: val }));
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '760px' }}>

        {/* ── Page Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontWeight: 700, fontSize: '28px', letterSpacing: '-0.5px', color: '#191B23', margin: 0 }}>
              Settings
            </h1>
            <p style={{ fontSize: '14px', color: '#434654', margin: '6px 0 0' }}>
              Manage your account preferences and system configuration.
            </p>
          </div>

          {savedProfile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '999px',
              background: '#DCFCE7', color: '#166534',
              fontSize: '12px', fontWeight: 500,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
              Changes saved
            </div>
          )}
        </div>

        {/* ── Profile Section ── */}
        <SectionCard
          title="Profile"
          description="Your personal information shown across the system."
          action={
            editing ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleCancelEdit}
                  style={{
                    height: '30px', padding: '0 12px',
                    border: '1px solid #C3C5D7', borderRadius: '4px',
                    background: '#FFFFFF', color: '#434654',
                    fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  style={{
                    height: '30px', padding: '0 14px',
                    border: 'none', borderRadius: '4px',
                    background: savingProfile ? '#6B8CC7' : '#003298', color: '#FFFFFF',
                    fontSize: '12px', fontWeight: 500, cursor: savingProfile ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)',
                  }}
                >
                  {savingProfile ? 'Saving…' : 'Save'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleEditToggle}
                style={{
                  height: '30px', padding: '0 14px',
                  border: '1px solid #C3C5D7', borderRadius: '4px',
                  background: '#FFFFFF', color: '#434654',
                  fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Edit Profile
              </button>
            )
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Full Name">
              <EditableField value={editing ? draft.fullName : profile.fullName} onChange={updateDraft('fullName')} placeholder="Your full name" editing={editing} />
            </Field>
            <Field label="Email">
              <ReadonlyField value={profile.email} />
            </Field>
            <Field label="Phone">
              <EditableField value={editing ? draft.phone : profile.phone} onChange={updateDraft('phone')} placeholder="+84 90 000 0000" editing={editing} />
            </Field>
            <Field label="Role">
              <ReadonlyField value={profile.role} />
            </Field>
          </div>
        </SectionCard>

        {/* ── Organization Section ── */}
        <SectionCard
          title="Organization"
          description="Details about your organization displayed on event pages."
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Organization Name">
              <EditableField value={editing ? draft.organizationName : profile.organizationName} onChange={updateDraft('organizationName')} placeholder="Your organization" editing={editing} />
            </Field>
            <Field label="Website">
              <EditableField value={editing ? draft.organizationWebsite : profile.organizationWebsite} onChange={updateDraft('organizationWebsite')} placeholder="https://..." editing={editing} />
            </Field>
          </div>
        </SectionCard>

        {/* ── Security Section ── */}
        <SectionCard
          title="Security"
          description="Manage your password and authentication settings."
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#191B23', margin: '0 0 2px' }}>Password</p>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>Last changed: Never</p>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              style={{
                height: '34px', padding: '0 16px',
                border: '1px solid #C3C5D7', borderRadius: '4px',
                background: '#FFFFFF', color: '#434654',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              Change Password
            </button>
          </div>
        </SectionCard>

        {/* ── Notifications Section ── */}
        <SectionCard
          title="Notifications"
          description="Choose which events trigger email notifications to you."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <Toggle
              label="New order placed"
              checked={notifications.newOrder}
              onChange={(v) => setNotifications((p) => ({ ...p, newOrder: v }))}
            />
            <Toggle
              label="Payment failed"
              checked={notifications.paymentFailed}
              onChange={(v) => setNotifications((p) => ({ ...p, paymentFailed: v }))}
            />
            <Toggle
              label="File upload completed"
              checked={notifications.uploadComplete}
              onChange={(v) => setNotifications((p) => ({ ...p, uploadComplete: v }))}
            />
            <Toggle
              label="Check-in anomaly detected"
              checked={notifications.checkinAnomaly}
              onChange={(v) => setNotifications((p) => ({ ...p, checkinAnomaly: v }))}
            />
            <Toggle
              label="Weekly summary report"
              checked={notifications.weeklyReport}
              onChange={(v) => setNotifications((p) => ({ ...p, weeklyReport: v }))}
            />
          </div>
        </SectionCard>

        {/* ── Danger Zone ── */}
        <SectionCard title="Danger Zone">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#191B23', margin: '0 0 2px' }}>Deactivate Account</p>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>Permanently disable access to this account.</p>
            </div>
            <button style={{
              height: '34px', padding: '0 16px',
              border: '1px solid #FECACA', borderRadius: '4px',
              background: '#FFF5F5', color: '#BA1A1A',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>
              Deactivate
            </button>
          </div>
        </SectionCard>
      </div>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </>
  );
}