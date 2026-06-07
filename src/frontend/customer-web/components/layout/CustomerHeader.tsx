'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface CustomerHeaderProps {
  concertName?: string;
}

export default function CustomerHeader({ concertName }: CustomerHeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            TB
          </span>
          <span className="text-lg font-semibold text-slate-900">TicketBox</span>
        </Link>

        {concertName && (
          <p className="hidden max-w-md truncate text-sm text-slate-600 sm:block">{concertName}</p>
        )}

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-slate-600 hover:text-indigo-600">
            Sự kiện
          </Link>
          {isAuthenticated ? (
            <>
              <span className="hidden text-slate-600 sm:inline">
                {user?.fullName ?? user?.email}
              </span>
              <button
                type="button"
                onClick={logout}
                className="text-slate-600 hover:text-indigo-600"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
              Đăng nhập
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
