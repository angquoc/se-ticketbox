'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { abandonAllPurchaseFlows } from '@/lib/waiting-room-abandon';

interface CustomerHeaderProps {
  concertName?: string;
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {open ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </>
      )}
    </svg>
  );
}

export default function CustomerHeader({ concertName }: CustomerHeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLeavePurchaseFlow = useCallback(() => {
    abandonAllPurchaseFlows();
    setMenuOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    setMenuOpen(false);
    logout();
  }, [logout]);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const navLinkClass =
    'block rounded-lg px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-indigo-600';
  const desktopLinkClass = 'text-slate-600 hover:text-indigo-600';

  return (
    <header className="relative sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" onClick={handleLeavePurchaseFlow} className="flex min-w-0 shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            TB
          </span>
          <span className="text-lg font-semibold text-slate-900">TicketBox</span>
        </Link>

        {concertName && (
          <p className="hidden min-w-0 flex-1 truncate text-center text-sm text-slate-600 md:block">
            {concertName}
          </p>
        )}

        <nav className="hidden items-center gap-4 text-sm md:flex">
          <Link href="/" onClick={handleLeavePurchaseFlow} className={desktopLinkClass}>
            Sự kiện
          </Link>
          {isAuthenticated && (
            <>
              <Link href="/orders" onClick={handleLeavePurchaseFlow} className={desktopLinkClass}>
                Đơn hàng
              </Link>
              <Link href="/tickets" onClick={handleLeavePurchaseFlow} className={desktopLinkClass}>
                Vé của tôi
              </Link>
              <Link href="/account" onClick={handleLeavePurchaseFlow} className={desktopLinkClass}>
                Tài khoản
              </Link>
            </>
          )}
          {isAuthenticated ? (
            <>
              <span className="hidden text-slate-600 lg:inline">
                {user?.fullName ?? user?.email}
              </span>
              <button type="button" onClick={handleLogout} className={desktopLinkClass}>
                Đăng xuất
              </button>
            </>
          ) : (
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
              Đăng nhập
            </Link>
          )}
        </nav>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-indigo-600 md:hidden"
          aria-expanded={menuOpen}
          aria-controls="customer-mobile-nav"
          aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MenuIcon open={menuOpen} />
        </button>
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 top-14 z-40 bg-slate-900/20 md:hidden"
            aria-label="Đóng menu"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            id="customer-mobile-nav"
            className="absolute left-0 right-0 top-full z-50 border-b border-slate-200 bg-white shadow-lg md:hidden"
          >
            <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
              {concertName && (
                <p className="mb-2 truncate border-b border-slate-100 pb-3 text-sm font-medium text-slate-600">
                  {concertName}
                </p>
              )}

              {isAuthenticated && (
                <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {user?.fullName ?? user?.email}
                </p>
              )}

              <div className="space-y-1">
                <Link href="/" onClick={handleLeavePurchaseFlow} className={navLinkClass}>
                  Sự kiện
                </Link>
                {isAuthenticated && (
                  <>
                    <Link href="/orders" onClick={handleLeavePurchaseFlow} className={navLinkClass}>
                      Đơn hàng
                    </Link>
                    <Link href="/tickets" onClick={handleLeavePurchaseFlow} className={navLinkClass}>
                      Vé của tôi
                    </Link>
                    <Link href="/account" onClick={handleLeavePurchaseFlow} className={navLinkClass}>
                      Tài khoản
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-3 border-t border-slate-100 pt-3">
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`${navLinkClass} w-full text-left`}
                  >
                    Đăng xuất
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg bg-indigo-600 px-3 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                  >
                    Đăng nhập
                  </Link>
                )}
              </div>
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
