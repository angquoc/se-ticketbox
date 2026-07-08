'use client';

import { useEffect, useState } from 'react';

interface TokenExpiryBannerProps {
  remainingMs: number | null;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes} phút ${seconds.toString().padStart(2, '0')} giây`;
  }
  return `${seconds} giây`;
}

export default function TokenExpiryBanner({ remainingMs }: TokenExpiryBannerProps) {
  const [displayMs, setDisplayMs] = useState(remainingMs);

  useEffect(() => {
    setDisplayMs(remainingMs);
    if (remainingMs === null) return;

    const interval = setInterval(() => {
      setDisplayMs((current) => {
        if (current === null) return null;
        return Math.max(0, current - 1000);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingMs]);

  if (displayMs === null) return null;

  const isUrgent = displayMs <= 60_000;

  return (
    <div
      className={`rounded-lg border px-4 py-2 text-sm ${
        isUrgent
          ? 'border-amber-300 bg-amber-50 text-amber-900'
          : 'border-indigo-200 bg-indigo-50 text-indigo-900'
      }`}
    >
      Lượt mua vé của bạn còn hiệu lực trong{' '}
      <span className="font-semibold">{formatRemaining(displayMs)}</span>. Hoàn tất chọn vé và
      thanh toán trước khi hết hạn.
    </div>
  );
}
