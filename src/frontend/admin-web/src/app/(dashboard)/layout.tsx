'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/layout/AdminSidebar';
import AdminHeader from '@/components/layout/AdminHeader';
import Spinner from '@/components/ui/Spinner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.role !== 'ADMIN' && user.role !== 'ORGANIZER') {
        alert('Tài khoản của bạn không có quyền truy cập trang quản trị!');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }
      setAuthorized(true);
    } catch (e) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router]);

  if (!authorized) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-page)' }}>
        <Spinner size={36} />
      </div>
    );
  }

  return (
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
  );
}