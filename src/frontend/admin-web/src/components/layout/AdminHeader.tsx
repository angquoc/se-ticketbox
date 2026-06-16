export default function AdminHeader() {
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

        {/* Avatar */}
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '12px',
          background: '#E7E7F3',
          border: '1px solid #C3C5D7',
          overflow: 'hidden',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img
            src="https://ui-avatars.com/api/?name=Admin&background=E7E7F3&color=003298&bold=true&size=32"
            alt="Administrator Profile"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      </div>
    </header>
  );
}