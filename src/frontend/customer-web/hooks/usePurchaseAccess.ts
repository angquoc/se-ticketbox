'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAdmittedTokenRemainingMs } from '@/lib/waiting-room-storage';
import { requestPurchaseAccess } from '@/lib/waiting-room-access';

const TOKEN_CHECK_INTERVAL_MS = 5_000;

interface UsePurchaseAccessOptions {
  concertId: string;
  /** Gọi khi token hết hạn hoặc không còn quyền mua vé */
  onAccessLost?: () => void;
}

export function usePurchaseAccess({ concertId, onAccessLost }: UsePurchaseAccessOptions) {
  const router = useRouter();
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [tokenRemainingMs, setTokenRemainingMs] = useState<number | null>(null);

  const redirectToWaiting = useCallback(() => {
    router.replace(`/concerts/${concertId}/waiting`);
  }, [concertId, router]);

  useEffect(() => {
    let cancelled = false;

    async function verifyAccess() {
      setAccessError(null);
      try {
        const result = await requestPurchaseAccess(concertId);
        if (cancelled) return;

        if (result.granted) {
          setAccessChecked(true);
          setTokenRemainingMs(getAdmittedTokenRemainingMs(concertId));
          return;
        }

        redirectToWaiting();
      } catch (error) {
        if (!cancelled) {
          setAccessError(
            error instanceof Error ? error.message : 'Không thể xác minh quyền truy cập',
          );
        }
      }
    }

    setAccessChecked(false);
    void verifyAccess();

    return () => {
      cancelled = true;
    };
  }, [concertId, redirectToWaiting]);

  useEffect(() => {
    if (!accessChecked) return;

    function checkToken() {
      const remaining = getAdmittedTokenRemainingMs(concertId);
      if (remaining === null) {
        onAccessLost?.();
        redirectToWaiting();
        return;
      }
      setTokenRemainingMs(remaining);
    }

    checkToken();
    const interval = setInterval(checkToken, TOKEN_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [accessChecked, concertId, onAccessLost, redirectToWaiting]);

  return {
    accessChecked,
    accessError,
    tokenRemainingMs,
    redirectToWaiting,
  };
}
