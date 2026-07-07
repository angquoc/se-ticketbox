'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isPurchaseFlowPath } from '@/lib/purchase-routes';
import { abandonPurchaseFlow } from '@/lib/waiting-room-abandon';
import { getAdmittedTokenRemainingMs } from '@/lib/waiting-room-storage';
import { requestPurchaseAccess } from '@/lib/waiting-room-access';

const TOKEN_CHECK_INTERVAL_MS = 5_000;

interface UsePurchaseAccessOptions {
  concertId: string;
  /** `true` khi user đang trong luồng mua vé và cần token (checkout / sau phòng chờ). */
  requireToken?: boolean;
  /** Gọi khi token hết hạn hoặc không còn quyền mua vé */
  onAccessLost?: () => void;
}

export function usePurchaseAccess({
  concertId,
  requireToken = false,
  onAccessLost,
}: UsePurchaseAccessOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [tokenRemainingMs, setTokenRemainingMs] = useState<number | null>(null);
  const pathnameRef = useRef(pathname);

  pathnameRef.current = pathname;

  const redirectToWaiting = useCallback(() => {
    if (!isPurchaseFlowPath(pathnameRef.current, concertId)) {
      return;
    }
    router.replace(`/concerts/${concertId}/waiting`);
  }, [concertId, router]);

  useEffect(() => {
    let cancelled = false;

    async function verifyAccess() {
      setAccessError(null);
      try {
        const result = await requestPurchaseAccess(concertId, { requireToken });
        if (cancelled) return;

        if (result.granted) {
          setAccessChecked(true);
          setTokenRemainingMs(
            result.token ? getAdmittedTokenRemainingMs(concertId) : null,
          );
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
  }, [concertId, requireToken, redirectToWaiting]);

  useEffect(() => {
    if (!requireToken || !accessChecked) return;

    function checkToken() {
      if (!isPurchaseFlowPath(pathnameRef.current, concertId)) {
        return;
      }

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
  }, [accessChecked, concertId, onAccessLost, redirectToWaiting, requireToken]);

  const abandonPurchaseFlowForConcert = useCallback(() => {
    abandonPurchaseFlow(concertId);
  }, [concertId]);

  return {
    accessChecked,
    accessError,
    tokenRemainingMs,
    redirectToWaiting,
    abandonPurchaseFlow: abandonPurchaseFlowForConcert,
  };
}
