export default function SettingsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontWeight: 700, fontSize: '30px', letterSpacing: '-0.6px', color: '#191B23', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: '14px', color: '#434654', margin: '4px 0 0' }}>Manage your account and system configuration.</p>
      </div>

      {/* Profile Section */}
      <div style={{ background: '#FFFFFF', border: '1px solid #C3C5D7', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#191B23', margin: '0 0 20px' }}>Profile</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '560px' }}>
          {[['Full Name', 'Admin User'], ['Email', 'admin@ticketbox.vn'], ['Role', 'ORGANIZER'], ['Phone', '+84 90 000 0000']].map(([label, val]) => (
            <div key={label}>
              <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#434654', margin: '0 0 6px' }}>{label}</p>
              <div style={{ height: '34px', border: '1px solid #C3C5D7', borderRadius: '4px', padding: '0 10px', display: 'flex', alignItems: 'center', fontSize: '13px', color: '#191B23', background: '#FAFAFA' }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Section */}
      <div style={{ background: '#FFFFFF', border: '1px solid #C3C5D7', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#191B23', margin: '0 0 16px' }}>Security</h2>
        <button style={{ height: '34px', padding: '0 16px', border: '1px solid #C3C5D7', borderRadius: '4px', background: '#FFFFFF', color: '#434654', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          Change Password
        </button>
      </div>
    </div>
  );
}