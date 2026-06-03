import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import {AdminSidebar, AdminHeader} from '@/components/layout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TicketBox Admin',
  description: 'Quản lý sự kiện & vé bán',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <div className="flex">
          {/* Sidebar cố định */}
          <AdminSidebar />

          {/* Main content */}
          <main className="ml-64 flex-1 min-h-screen">
            <AdminHeader />
            <div className="p-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}