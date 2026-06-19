'use client';

import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#FAF8FF',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Decorative Brand Panel (hidden on mobile) */}
      <div className="hidden md:flex" style={{
        flex: 1,
        background: 'linear-gradient(135deg, #00123a 0%, #003298 100%)',
        position: 'relative',
        overflow: 'hidden',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
        color: '#FFFFFF',
      }}>
        {/* Glow Effects */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(220, 225, 255, 0.15)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-10%',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'rgba(208, 225, 251, 0.1)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }} />

        {/* Branding header */}
        <div style={{ zIndex: 1 }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 900,
            letterSpacing: '-0.8px',
            margin: 0,
            lineHeight: 1,
          }}>TicketBox</h1>
          <p style={{
            fontSize: '14px',
            color: '#DCE1FF',
            marginTop: '6px',
            fontWeight: 500,
            letterSpacing: '0.5px',
          }}>EVENT CONTROL CENTER</p>
        </div>

        {/* Center: Interactive Glassmorphic Stats Display */}
        <div style={{
          zIndex: 1,
          background: 'rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          maxWidth: '440px',
          alignSelf: 'center',
          marginTop: 'auto',
          marginBottom: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}>
          <div>
            <span style={{
              display: 'inline-block',
              padding: '4px 8px',
              background: 'rgba(220, 225, 255, 0.2)',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.5px',
              color: '#FFFFFF',
              textTransform: 'uppercase',
            }}>
              Core Dashboard
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginTop: '12px', marginBottom: '8px', lineHeight: 1.3 }}>
              Quản lý sự kiện và tối ưu bán vé dễ dàng hơn
            </h2>
            <p style={{ fontSize: '13px', color: '#D0E1FB', lineHeight: 1.6, margin: 0 }}>
              Một cổng quản lý trung tâm dành cho các nhà tổ chức sự kiện để tạo, thiết lập và giám sát quá trình bán vé theo thời gian thực.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '20px' }}>
            <div>
              <p style={{ fontSize: '11px', color: '#D0E1FB', textTransform: 'uppercase', margin: 0 }}>Giao dịch thành công</p>
              <p style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', fontWeight: 700, margin: '4px 0 0' }}>+98.6%</p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#D0E1FB', textTransform: 'uppercase', margin: 0 }}>Bán hết vé sớm</p>
              <p style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', fontWeight: 700, margin: '4px 0 0' }}>12 Sự kiện</p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ zIndex: 1, display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#D0E1FB' }}>
          <span>© 2026 TicketBox Team.</span>
          <span>Version 1.0.0</span>
        </div>
      </div>

      {/* Auth Forms Panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#FAF8FF',
      }}>
        {children}
      </div>
    </div>
  );
}
