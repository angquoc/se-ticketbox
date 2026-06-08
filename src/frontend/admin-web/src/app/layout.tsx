import type { Metadata } from 'next';
import '@/styles/globals.css';
import AdminSidebar from '@/components/layout/AdminSidebar';
import AdminHeader from '@/components/layout/AdminHeader';

export const metadata: Metadata = {
  title: 'TicketBox Admin',
  description: 'Event Control Center',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg-page)' }}>
          <AdminSidebar />
          <div style={{ marginLeft: '260px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AdminHeader />
            <main style={{
              flex: 1,
              background: 'var(--color-bg-canvas)',
              padding: '32px',
              overflowY: 'auto',
            }}>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}